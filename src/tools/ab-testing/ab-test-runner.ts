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

export interface ConfigResult {
  answer: string;
  sources: string[];
  scores: TestScores;
  executionTime: number;
  errors?: string;
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
      };
      configB: {
        accuracy: number;
        completeness: number;
        helpfulness: number;
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
  ): Promise<{ answer: string; sources: string[]; executionTime: number; errors?: string }> {
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
        executionTime
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
        errors: errorMessage
      };
    }
  }

  private async evaluateWithStrategy(
    answer: string,
    sources: string[],
    expectedKeywords: string[],
    expectedSources: string[],
    strategy: 'keywords' | 'sources' | 'llm-evaluation'
  ): Promise<TestScores> {
    switch (strategy) {
      case 'keywords':
        const { evaluateWithKeywords } = await import('./evaluation-strategies/keywords-matching');
        return evaluateWithKeywords(answer, expectedKeywords);
      
      case 'sources':
        throw new Error('Source accuracy evaluation not implemented yet');
      
      case 'llm-evaluation':
        throw new Error('LLM-based evaluation not implemented yet');
      
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
      strategy
    );

    const resultB = await this.sendQuestionToChatbot(testCase.question, configB);
    const scoresB = await this.evaluateWithStrategy(
      resultB.answer,
      resultB.sources,
      testCase.expectedKeywords,
      testCase.expectedSources,
      strategy
    );

    const winner = scoresA.helpfulness > scoresB.helpfulness ? 'A' : 
                   scoresB.helpfulness > scoresA.helpfulness ? 'B' : 'tie';
    const scoreDifference = Math.abs(scoresA.helpfulness - scoresB.helpfulness);

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
        errors: resultA.errors
      },
      configB: {
        answer: resultB.answer,
        sources: resultB.sources,
        scores: scoresB,
        executionTime: resultB.executionTime,
        errors: resultB.errors
      },
      winner,
      scoreDifference,
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
        
        await new Promise(resolve => setTimeout(resolve, 100));
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

    const averageScores = {
      configA: {
        accuracy: results.reduce((sum, r) => sum + r.configA.scores.accuracy, 0) / totalTests,
        completeness: results.reduce((sum, r) => sum + r.configA.scores.completeness, 0) / totalTests,
        helpfulness: results.reduce((sum, r) => sum + r.configA.scores.helpfulness, 0) / totalTests,
      },
      configB: {
        accuracy: results.reduce((sum, r) => sum + r.configB.scores.accuracy, 0) / totalTests,
        completeness: results.reduce((sum, r) => sum + r.configB.scores.completeness, 0) / totalTests,
        helpfulness: results.reduce((sum, r) => sum + r.configB.scores.helpfulness, 0) / totalTests,
      },
    };

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
        averageConfigAScore: categoryResults.reduce((sum, r) => sum + r.configA.scores.helpfulness, 0) / categoryResults.length,
        averageConfigBScore: categoryResults.reduce((sum, r) => sum + r.configB.scores.helpfulness, 0) / categoryResults.length,
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
        averageConfigAScore: difficultyResults.reduce((sum, r) => sum + r.configA.scores.helpfulness, 0) / difficultyResults.length,
        averageConfigBScore: difficultyResults.reduce((sum, r) => sum + r.configB.scores.helpfulness, 0) / difficultyResults.length,
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
      results,
      categoryBreakdown,
      difficultyBreakdown
    };
  }

  private async saveReport(report: ABTestReport, configAName: string, configBName: string): Promise<void> {
    try {
      const response = await fetch('/api/ab-test-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          report,
          configAName,
          configBName
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save report: ${response.status}`);
      }

      const result = await response.json();
      console.log(`Report saved successfully: ${result.filename}`);
    } catch (error) {
      console.error('Failed to save report:', error);
    }
  }
} 