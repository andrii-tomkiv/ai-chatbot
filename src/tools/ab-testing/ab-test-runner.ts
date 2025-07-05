export interface TestConfiguration {
  name: string;
  provider: string;
  model: string;
  maxTokens: number;
  temperature: number;
  maxResults: number;
  systemPrompt: string;
}

export interface TestCase {
  id: string;
  category: string;
  difficulty: string;
  question: string;
  expectedKeywords: string[];
  expectedSources: string[];
}

export interface TestScores {
  accuracy: number;
  completeness: number;
  helpfulness: number;
  keywordMatches: string[];
  missingKeywords: string[];
}

// New interface for LLM evaluation results
export interface LLMTestScores {
  faithfulness: number;
  helpfulness: number;
  justification?: string;
  keywordMatches: string[];
  missingKeywords: string[];
}

export interface ConfigResult {
  answer: string;
  sources: string[];
  scores: TestScores;
  llmScores?: LLMTestScores; // Optional LLM-specific scores
  executionTime: number;
  errors?: string;
  context?: string;
}

export interface TestResult {
  testCaseId: string;
  category: string;
  difficulty: string;
  question: string;
  configA: ConfigResult;
  configB: ConfigResult;
  winner: 'A' | 'B' | 'tie';
  scoreDifference: number;
  evaluationStrategy: string; // Track which evaluation strategy was used
}

export interface ABTestReport {
  timestamp: string;
  configurations: {
    A: TestConfiguration;
    B: TestConfiguration;
  };
  evaluationStrategy: string;
  summary: {
    totalTests: number;
    configAWins: number;
    configBWins: number;
    ties: number;
    averageScores: {
      configA: {
        accuracy: number;
        completeness: number;
        helpfulness: number;
        faithfulness?: number; // Optional LLM-specific averages
      };
      configB: {
        accuracy: number;
        completeness: number;
        helpfulness: number;
        faithfulness?: number; // Optional LLM-specific averages
      };
    };
    executionTime: number;
  };
  results: TestResult[];
  categoryBreakdown: Record<string, any>;
  difficultyBreakdown: Record<string, any>;
}

export class ABTestRunner {
  private testCases: TestCase[] = [];
  private baseUrl: string;
  private onProgress?: (progress: number, message: string) => void;

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  setProgressCallback(callback: (progress: number, message: string) => void) {
    this.onProgress = callback;
  }

  private async loadTestCases(): Promise<void> {
    try {
      this.onProgress?.(5, 'Loading test cases...');
      const response = await fetch('/api/test-cases');
      if (!response.ok) {
        throw new Error(`Failed to load test cases: ${response.status}`);
      }
      const data = await response.json();
      this.testCases = data.testCases;
      this.onProgress?.(10, `Loaded ${this.testCases.length} test cases`);
    } catch (error) {
      console.error('Failed to load test cases:', error);
      this.testCases = [];
      throw error;
    }
  }

  private async sendQuestionToChatbot(
    question: string,
    config: TestConfiguration,
    retryCount = 0
  ): Promise<{ answer: string; sources: string[]; executionTime: number; errors?: string; context?: string }> {
    const startTime = Date.now();
    const maxRetries = 2;
    
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 30000);
      });

      const requestPromise = fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'ABTestRunner/1.0',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: config.systemPrompt
            },
            {
              role: 'user',
              content: question
            }
          ],
          options: {
            model: config.model,
            maxTokens: config.maxTokens,
            temperature: config.temperature,
            maxResults: config.maxResults
          }
        }),
      });

      const response = await Promise.race([requestPromise, timeoutPromise]) as Response;
      const executionTime = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      return {
        answer: data.answer || '',
        sources: data.sources || [],
        executionTime,
        context: data.context || ''
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      if (retryCount < maxRetries && error instanceof Error) {
        const shouldRetry = error.message.includes('timeout') || 
                           error.message.includes('fetch') ||
                           error.message.includes('network');
        
        if (shouldRetry) {
          console.log(`Retrying request to ${config.provider} (${config.model}), attempt ${retryCount + 1}/${maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
          return this.sendQuestionToChatbot(question, config, retryCount + 1);
        }
      }
      
      console.error(`Error sending question to ${config.provider} (${config.model}):`, error);
      
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
        if (error.message.includes('timeout')) {
          errorMessage = `Request timeout after ${executionTime}ms. The AI service may be overloaded.`;
        } else if (error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (error.message.includes('HTTP')) {
          errorMessage = `API error: ${error.message}`;
        }
      }
      
      return {
        answer: '',
        sources: [],
        executionTime,
        errors: errorMessage,
        context: ''
      };
    }
  }

  private async evaluateWithStrategy(
    answer: string,
    sources: string[],
    expectedKeywords: string[],
    expectedSources: string[],
    strategy: 'keywords' | 'sources' | 'llm-evaluation',
    context?: string,
    userQuestion?: string
  ): Promise<TestScores> {
    switch (strategy) {
      case 'keywords':
        const { evaluateWithKeywords } = await import('./evaluation-strategies/keywords-matching');
        return evaluateWithKeywords(answer, expectedKeywords);
      
      case 'sources':
        throw new Error('Source accuracy evaluation not implemented yet');
      
      case 'llm-evaluation':
        if (!context || !userQuestion) {
          throw new Error('Context and user question are required for LLM evaluation');
        }
        const { evaluateWithLLM } = await import('./evaluation-strategies/llm-evaluation');
        return evaluateWithLLM(answer, sources, expectedKeywords, expectedSources, context, userQuestion);
      
      default:
        throw new Error(`Unknown evaluation strategy: ${strategy}`);
    }
  }

  private async evaluateTestCase(
    testCase: TestCase,
    configA: TestConfiguration,
    configB: TestConfiguration,
    strategy: 'keywords' | 'sources' | 'llm-evaluation'
  ): Promise<TestResult> {
    this.onProgress?.(0, `Evaluating ${testCase.id}: ${testCase.question.substring(0, 50)}...`);

    const resultA = await this.sendQuestionToChatbot(testCase.question, configA);
    const scoresA = await this.evaluateWithStrategy(
      resultA.answer,
      resultA.sources,
      testCase.expectedKeywords,
      testCase.expectedSources,
      strategy,
      resultA.context,
      testCase.question
    );

    const resultB = await this.sendQuestionToChatbot(testCase.question, configB);
    const scoresB = await this.evaluateWithStrategy(
      resultB.answer,
      resultB.sources,
      testCase.expectedKeywords,
      testCase.expectedSources,
      strategy,
      resultB.context,
      testCase.question
    );

    // Determine winner based on evaluation strategy
    let winner: 'A' | 'B' | 'tie';
    let scoreDifference: number;
    
    if (strategy === 'llm-evaluation') {
      // For LLM evaluation, compare helpfulness scores
      const scoreA = scoresA.helpfulness;
      const scoreB = scoresB.helpfulness;
      winner = scoreA > scoreB ? 'A' : scoreA < scoreB ? 'B' : 'tie';
      scoreDifference = Math.abs(scoreA - scoreB);
    } else {
      // For other strategies, use helpfulness as before
      winner = scoresA.helpfulness > scoresB.helpfulness ? 'A' : 
               scoresB.helpfulness > scoresA.helpfulness ? 'B' : 'tie';
      scoreDifference = Math.abs(scoresA.helpfulness - scoresB.helpfulness);
    }

    return {
      testCaseId: testCase.id,
      category: testCase.category,
      difficulty: testCase.difficulty,
      question: testCase.question,
      configA: {
        answer: resultA.answer,
        sources: resultA.sources,
        scores: scoresA,
        executionTime: resultA.executionTime,
        errors: resultA.errors,
        context: resultA.context
      },
      configB: {
        answer: resultB.answer,
        sources: resultB.sources,
        scores: scoresB,
        executionTime: resultB.executionTime,
        errors: resultB.errors,
        context: resultB.context
      },
      winner,
      scoreDifference,
      evaluationStrategy: strategy
    };
  }

  async runTest(
    configA: TestConfiguration,
    configB: TestConfiguration,
    selectedCategories: string[],
    strategy: 'keywords' | 'sources' | 'llm-evaluation'
  ): Promise<TestResult[]> {
    const startTime = Date.now();

    await this.loadTestCases();
    
    const testCasesToRun = this.testCases.filter(testCase => 
      selectedCategories.length === 0 || selectedCategories.includes(testCase.category)
    );

    if (testCasesToRun.length === 0) {
      throw new Error('No test cases found for the selected categories');
    }

    this.onProgress?.(15, `Starting A/B test with ${testCasesToRun.length} test cases...`);
    console.log(`Configuration A: ${configA.name} (${configA.provider})`);
    console.log(`Configuration B: ${configB.name} (${configB.provider})`);
    console.log(`Strategy: ${strategy}`);

    const results: TestResult[] = [];

    for (let i = 0; i < testCasesToRun.length; i++) {
      const testCase = testCasesToRun[i];
      const progress = 15 + ((i + 1) / testCasesToRun.length) * 70; // 15% to 85%
      
      try {
        const result = await this.evaluateTestCase(testCase, configA, configB, strategy);
        results.push(result);
        
        this.onProgress?.(progress, `Completed ${i + 1}/${testCasesToRun.length} tests`);
        
        // Add longer delay for LLM evaluation to respect rate limits
        const delay = strategy === 'llm-evaluation' ? 3000 : 100; // 3 seconds for LLM, 100ms for others
        await new Promise(resolve => setTimeout(resolve, delay));
      } catch (error) {
        console.error(`Failed to evaluate test case ${testCase.id}:`, error);
        this.onProgress?.(progress, `Error in test ${testCase.id}, continuing...`);
      }
    }

    this.onProgress?.(90, 'Generating report...');
    
    const report = this.generateReport(results, configA, configB, strategy, Date.now() - startTime);
    await this.saveReport(report, configA.name, configB.name);
    
    this.onProgress?.(100, `Completed! ${results.length} tests processed`);

    return results;
  }

  private generateReport(
    results: TestResult[], 
    configA: TestConfiguration, 
    configB: TestConfiguration, 
    strategy: string, 
    executionTime: number
  ): ABTestReport {
    const timestamp = new Date().toISOString();
    const totalTests = results.length;
    
    const configAWins = results.filter(r => r.winner === 'A').length;
    const configBWins = results.filter(r => r.winner === 'B').length;
    const ties = results.filter(r => r.winner === 'tie').length;

    let averageScores: {
      configA: {
        accuracy: number;
        completeness: number;
        helpfulness: number;
        faithfulness?: number;
      };
      configB: {
        accuracy: number;
        completeness: number;
        helpfulness: number;
        faithfulness?: number;
      };
    };

    if (strategy === 'llm-evaluation') {
      // For LLM evaluation, calculate faithfulness averages with null safety
      averageScores = {
        configA: {
          accuracy: results.reduce((sum, r) => sum + (r.configA.scores.accuracy || 0), 0) / totalTests,
          completeness: results.reduce((sum, r) => sum + (r.configA.scores.completeness || 0), 0) / totalTests,
          helpfulness: results.reduce((sum, r) => sum + (r.configA.scores.helpfulness || 0), 0) / totalTests,
          faithfulness: results.reduce((sum, r) => sum + (r.configA.scores.accuracy || 0), 0) / totalTests // accuracy = faithfulness in LLM evaluation
        },
        configB: {
          accuracy: results.reduce((sum, r) => sum + (r.configB.scores.accuracy || 0), 0) / totalTests,
          completeness: results.reduce((sum, r) => sum + (r.configB.scores.completeness || 0), 0) / totalTests,
          helpfulness: results.reduce((sum, r) => sum + (r.configB.scores.helpfulness || 0), 0) / totalTests,
          faithfulness: results.reduce((sum, r) => sum + (r.configB.scores.accuracy || 0), 0) / totalTests // accuracy = faithfulness in LLM evaluation
        }
      };
    } else {
      // For other strategies, don't include faithfulness
      averageScores = {
        configA: {
          accuracy: results.reduce((sum, r) => sum + (r.configA.scores.accuracy || 0), 0) / totalTests,
          completeness: results.reduce((sum, r) => sum + (r.configA.scores.completeness || 0), 0) / totalTests,
          helpfulness: results.reduce((sum, r) => sum + (r.configA.scores.helpfulness || 0), 0) / totalTests,
        },
        configB: {
          accuracy: results.reduce((sum, r) => sum + (r.configB.scores.accuracy || 0), 0) / totalTests,
          completeness: results.reduce((sum, r) => sum + (r.configB.scores.completeness || 0), 0) / totalTests,
          helpfulness: results.reduce((sum, r) => sum + (r.configB.scores.helpfulness || 0), 0) / totalTests,
        }
      };
    }

    const categoryBreakdown: Record<string, any> = {};
    const categoryGroups = results.reduce((groups, result) => {
      if (!groups[result.category]) {
        groups[result.category] = [];
      }
      groups[result.category].push(result);
      return groups;
    }, {} as Record<string, TestResult[]>);

    for (const [category, categoryResults] of Object.entries(categoryGroups)) {
      categoryBreakdown[category] = {
        total: categoryResults.length,
        configAWins: categoryResults.filter(r => r.winner === 'A').length,
        configBWins: categoryResults.filter(r => r.winner === 'B').length,
        ties: categoryResults.filter(r => r.winner === 'tie').length,
        averageConfigAScore: categoryResults.reduce((sum, r) => sum + (r.configA.scores.helpfulness || 0), 0) / categoryResults.length,
        averageConfigBScore: categoryResults.reduce((sum, r) => sum + (r.configB.scores.helpfulness || 0), 0) / categoryResults.length,
      };
    }

    const difficultyBreakdown: Record<string, any> = {};
    const difficultyGroups = results.reduce((groups, result) => {
      if (!groups[result.difficulty]) {
        groups[result.difficulty] = [];
      }
      groups[result.difficulty].push(result);
      return groups;
    }, {} as Record<string, TestResult[]>);

    for (const [difficulty, difficultyResults] of Object.entries(difficultyGroups)) {
      difficultyBreakdown[difficulty] = {
        total: difficultyResults.length,
        configAWins: difficultyResults.filter(r => r.winner === 'A').length,
        configBWins: difficultyResults.filter(r => r.winner === 'B').length,
        ties: difficultyResults.filter(r => r.winner === 'tie').length,
        averageConfigAScore: difficultyResults.reduce((sum, r) => sum + (r.configA.scores.helpfulness || 0), 0) / difficultyResults.length,
        averageConfigBScore: difficultyResults.reduce((sum, r) => sum + (r.configB.scores.helpfulness || 0), 0) / difficultyResults.length,
      };
    }

    return {
      timestamp,
      configurations: { A: configA, B: configB },
      evaluationStrategy: strategy,
      summary: {
        totalTests,
        configAWins,
        configBWins,
        ties,
        averageScores,
        executionTime
      },
      results: (results || []).map(result => ({
        ...result,
        configA: {
          ...result.configA,
          // Ensure context is properly handled
          context: result.configA.context ? 
            (typeof result.configA.context === 'string' ? result.configA.context : JSON.stringify(result.configA.context)) : 
            undefined
        },
        configB: {
          ...result.configB,
          // Ensure context is properly handled
          context: result.configB.context ? 
            (typeof result.configB.context === 'string' ? result.configB.context : JSON.stringify(result.configB.context)) : 
            undefined
        }
      })),
      categoryBreakdown,
      difficultyBreakdown
    };
  }

  private async saveReport(report: ABTestReport, configAName: string, configBName: string): Promise<void> {
    try {
      console.log('Attempting to save report:', {
        configAName,
        configBName,
        evaluationStrategy: report.evaluationStrategy,
        resultsCount: report.results.length,
        timestamp: report.timestamp
      });
      
      // Clean and validate the report data before sending
      const cleanReport = {
        ...report,
        // Ensure all required fields are present
        timestamp: report.timestamp || new Date().toISOString(),
        configurations: report.configurations,
        evaluationStrategy: report.evaluationStrategy || 'unknown',
        summary: report.summary,
        results: (report.results || []).map(result => ({
          ...result,
          configA: {
            ...result.configA,
            // Ensure context is properly handled
            context: result.configA.context ? 
              (typeof result.configA.context === 'string' ? result.configA.context : JSON.stringify(result.configA.context)) : 
              undefined
          },
          configB: {
            ...result.configB,
            // Ensure context is properly handled
            context: result.configB.context ? 
              (typeof result.configB.context === 'string' ? result.configB.context : JSON.stringify(result.configB.context)) : 
              undefined
          }
        })),
        categoryBreakdown: report.categoryBreakdown || {},
        difficultyBreakdown: report.difficultyBreakdown || {}
      };
      
      const response = await fetch('/api/ab-test-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          report: cleanReport,
          configAName,
          configBName
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Save report failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`Failed to save report: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log(`Report saved successfully: ${result.filename}`);
    } catch (error) {
      console.error('Failed to save report:', error);
      console.error('Report structure:', {
        hasTimestamp: !!report.timestamp,
        hasConfigurations: !!report.configurations,
        hasResults: !!report.results,
        resultsLength: report.results?.length,
        hasSummary: !!report.summary,
        evaluationStrategy: report.evaluationStrategy
      });
      throw error;
    }
  }
} 