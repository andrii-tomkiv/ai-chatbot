import fs from 'fs';
import path from 'path';

interface TestCase {
  id: string;
  category: string;
  difficulty: string;
  question: string;
  expectedKeywords: string[];
  expectedSources: string[];
}

interface ProviderResult {
  provider: string;
  answer: string;
  sources: string[];
  scores: {
    accuracy: number;
    completeness: number;
    helpfulness: number;
  };
  keywordMatches: string[];
  missingKeywords: string[];
  errors?: string;
}

interface EvaluationResult {
  testCaseId: string;
  category: string;
  difficulty: string;
  question: string;
  mistral: ProviderResult;
  groq: ProviderResult;
  winner: string; // 'mistral', 'groq', or 'tie'
  scoreDifference: number; // difference in helpfulness scores
  errors?: string;
}

interface TestSuite {
  testSuite: {
    name: string;
    description: string;
    version: string;
    totalTestCases: number;
  };
  testCases: TestCase[];
}

interface ComparisonReport {
  summary: {
    totalTests: number;
    mistralWins: number;
    groqWins: number;
    ties: number;
    averageScores: {
      mistral: {
        accuracy: number;
        completeness: number;
        helpfulness: number;
      };
      groq: {
        accuracy: number;
        completeness: number;
        helpfulness: number;
      };
    };
  };
  results: EvaluationResult[];
  categoryBreakdown: Record<string, {
    total: number;
    mistralWins: number;
    groqWins: number;
    ties: number;
    averageMistralScore: number;
    averageGroqScore: number;
  }>;
  difficultyBreakdown: Record<string, {
    total: number;
    mistralWins: number;
    groqWins: number;
    ties: number;
    averageMistralScore: number;
    averageGroqScore: number;
  }>;
}

class ChatbotEvaluator {
  private testSuite: TestSuite;
  private results: EvaluationResult[] = [];
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.testSuite = this.loadTestSuite();
  }

  private loadTestSuite(): TestSuite {
    const testCasesPath = path.join(process.cwd(), 'data', 'evaluation', 'evaluation-test-cases.json');
    const testCasesData = fs.readFileSync(testCasesPath, 'utf-8');
    return JSON.parse(testCasesData);
  }

  private async sendQuestionToChatbot(question: string, provider: 'mistral' | 'groq'): Promise<{ answer: string; sources: string[] }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'ChatbotEvaluator/1.0',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: question }],
          options: {
            model: provider === 'groq' ? 'llama-3.3-70b-versatile' : 'mistral-large-latest'
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Extract answer and sources from the non-streaming response
      const answer = data.answer || '';
      const sources = data.sources || [];

      return { answer, sources };
    } catch (error) {
      console.error(`Error sending question to ${provider}: ${error}`);
      return { answer: '', sources: [] };
    }
  }

  private calculateKeywordScore(answer: string, expectedKeywords: string[]): {
    score: number;
    matches: string[];
    missing: string[];
  } {
    const answerLower = answer.toLowerCase();
    const matches: string[] = [];
    const missing: string[] = [];

    for (const keyword of expectedKeywords) {
      if (answerLower.includes(keyword.toLowerCase())) {
        matches.push(keyword);
      } else {
        missing.push(keyword);
      }
    }

    const score = matches.length / expectedKeywords.length;
    return { score, matches, missing };
  }

  private calculateScores(
    answer: string,
    sources: string[],
    expectedKeywords: string[],
    expectedSources: string[]
  ) {
    const keywordResult = this.calculateKeywordScore(answer, expectedKeywords);

    // Accuracy: Based on keyword matches
    const accuracy = keywordResult.score;

    // Completeness: Based on how many keywords are found
    const completeness = keywordResult.score;

    // Helpfulness: Combination of accuracy and completeness (removed source accuracy)
    const helpfulness = (accuracy + completeness) / 2;

    return {
      accuracy: Math.round(accuracy * 5), // Convert to 1-5 scale
      completeness: Math.round(completeness * 5),
      helpfulness: Math.round(helpfulness * 5),
      keywordMatches: keywordResult.matches,
      missingKeywords: keywordResult.missing,
    };
  }

  async evaluateTestCase(testCase: TestCase): Promise<EvaluationResult> {
    console.log(`Evaluating TC${testCase.id}: ${testCase.question.substring(0, 50)}...`);

    try {
      const { answer: mistralAnswer, sources: mistralSources } = await this.sendQuestionToChatbot(testCase.question, 'mistral');
      const { answer: groqAnswer, sources: groqSources } = await this.sendQuestionToChatbot(testCase.question, 'groq');
      
      const mistralScores = this.calculateScores(
        mistralAnswer,
        mistralSources,
        testCase.expectedKeywords,
        testCase.expectedSources
      );
      const groqScores = this.calculateScores(
        groqAnswer,
        groqSources,
        testCase.expectedKeywords,
        testCase.expectedSources
      );

      const winner = mistralScores.helpfulness > groqScores.helpfulness ? 'mistral' : groqScores.helpfulness > mistralScores.helpfulness ? 'groq' : 'tie';
      const scoreDifference = Math.abs(mistralScores.helpfulness - groqScores.helpfulness);

      return {
        testCaseId: testCase.id,
        category: testCase.category,
        difficulty: testCase.difficulty,
        question: testCase.question,
        mistral: {
          provider: 'mistral',
          answer: mistralAnswer,
          sources: mistralSources,
          scores: mistralScores,
          keywordMatches: mistralScores.keywordMatches,
          missingKeywords: mistralScores.missingKeywords,
        },
        groq: {
          provider: 'groq',
          answer: groqAnswer,
          sources: groqSources,
          scores: groqScores,
          keywordMatches: groqScores.keywordMatches,
          missingKeywords: groqScores.missingKeywords,
        },
        winner,
        scoreDifference,
      };
    } catch (error) {
      return {
        testCaseId: testCase.id,
        category: testCase.category,
        difficulty: testCase.difficulty,
        question: testCase.question,
        mistral: {
          provider: 'mistral',
          answer: '',
          sources: [],
          scores: {
            accuracy: 1,
            completeness: 1,
            helpfulness: 1,
          },
          keywordMatches: [],
          missingKeywords: testCase.expectedKeywords,
        },
        groq: {
          provider: 'groq',
          answer: '',
          sources: [],
          scores: {
            accuracy: 1,
            completeness: 1,
            helpfulness: 1,
          },
          keywordMatches: [],
          missingKeywords: testCase.expectedKeywords,
        },
        winner: 'tie',
        scoreDifference: 0,
        errors: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private generateReport(): ComparisonReport {
    const totalTests = this.results.length;
    const mistralWins = this.results.filter(r => r.winner === 'mistral').length;
    const groqWins = this.results.filter(r => r.winner === 'groq').length;
    const ties = this.results.filter(r => r.winner === 'tie').length;

    const averageScores = {
      mistral: {
        accuracy: this.results.reduce((sum, r) => sum + r.mistral.scores.accuracy, 0) / totalTests,
        completeness: this.results.reduce((sum, r) => sum + r.mistral.scores.completeness, 0) / totalTests,
        helpfulness: this.results.reduce((sum, r) => sum + r.mistral.scores.helpfulness, 0) / totalTests,
      },
      groq: {
        accuracy: this.results.reduce((sum, r) => sum + r.groq.scores.accuracy, 0) / totalTests,
        completeness: this.results.reduce((sum, r) => sum + r.groq.scores.completeness, 0) / totalTests,
        helpfulness: this.results.reduce((sum, r) => sum + r.groq.scores.helpfulness, 0) / totalTests,
      },
    };

    // Category breakdown
    const categoryBreakdown: Record<string, any> = {};
    const categoryGroups = this.results.reduce((groups, result) => {
      if (!groups[result.category]) {
        groups[result.category] = [];
      }
      groups[result.category].push(result);
      return groups;
    }, {} as Record<string, EvaluationResult[]>);

    for (const [category, results] of Object.entries(categoryGroups)) {
      categoryBreakdown[category] = {
        total: results.length,
        mistralWins: results.filter(r => r.winner === 'mistral').length,
        groqWins: results.filter(r => r.winner === 'groq').length,
        ties: results.filter(r => r.winner === 'tie').length,
        averageMistralScore: results.reduce((sum, r) => sum + r.mistral.scores.helpfulness, 0) / results.length,
        averageGroqScore: results.reduce((sum, r) => sum + r.groq.scores.helpfulness, 0) / results.length,
      };
    }

    // Difficulty breakdown
    const difficultyBreakdown: Record<string, any> = {};
    const difficultyGroups = this.results.reduce((groups, result) => {
      if (!groups[result.difficulty]) {
        groups[result.difficulty] = [];
      }
      groups[result.difficulty].push(result);
      return groups;
    }, {} as Record<string, EvaluationResult[]>);

    for (const [difficulty, results] of Object.entries(difficultyGroups)) {
      difficultyBreakdown[difficulty] = {
        total: results.length,
        mistralWins: results.filter(r => r.winner === 'mistral').length,
        groqWins: results.filter(r => r.winner === 'groq').length,
        ties: results.filter(r => r.winner === 'tie').length,
        averageMistralScore: results.reduce((sum, r) => sum + r.mistral.scores.helpfulness, 0) / results.length,
        averageGroqScore: results.reduce((sum, r) => sum + r.groq.scores.helpfulness, 0) / results.length,
      };
    }

    return {
      summary: {
        totalTests,
        mistralWins,
        groqWins,
        ties,
        averageScores,
      },
      results: this.results,
      categoryBreakdown,
      difficultyBreakdown,
    };
  }

  async runEvaluation(): Promise<ComparisonReport> {
    console.log(`Starting evaluation of ${this.testSuite.testCases.length} test cases...`);
    console.log(`Target URL: ${this.baseUrl}`);

    for (const testCase of this.testSuite.testCases) {
      const result = await this.evaluateTestCase(testCase);
      this.results.push(result);
      
      // Add a small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const report = this.generateReport();
    return report;
  }

  saveReport(report: ComparisonReport, filename: string = 'evaluation-report.json') {
    const reportPath = path.join(process.cwd(), 'data', 'evaluation', filename);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`Evaluation report saved to: ${reportPath}`);
  }

  printSummary(report: ComparisonReport) {
    console.log('\n' + '='.repeat(60));
    console.log('EVALUATION SUMMARY');
    console.log('='.repeat(60));
    
    console.log(`Total Tests: ${report.summary.totalTests}`);
    console.log(`Mistral Wins: ${report.summary.mistralWins}`);
    console.log(`Groq Wins: ${report.summary.groqWins}`);
    console.log(`Ties: ${report.summary.ties}`);
    console.log(`Mistral Win Rate: ${((report.summary.mistralWins / report.summary.totalTests) * 100).toFixed(1)}%`);
    
    console.log('\nAverage Scores (1-5 scale):');
    console.log(`  Mistral Accuracy: ${report.summary.averageScores.mistral.accuracy.toFixed(2)}`);
    console.log(`  Mistral Completeness: ${report.summary.averageScores.mistral.completeness.toFixed(2)}`);
    console.log(`  Mistral Helpfulness: ${report.summary.averageScores.mistral.helpfulness.toFixed(2)}`);
    console.log(`  Groq Accuracy: ${report.summary.averageScores.groq.accuracy.toFixed(2)}`);
    console.log(`  Groq Completeness: ${report.summary.averageScores.groq.completeness.toFixed(2)}`);
    console.log(`  Groq Helpfulness: ${report.summary.averageScores.groq.helpfulness.toFixed(2)}`);

    console.log('\nCategory Breakdown:');
    for (const [category, stats] of Object.entries(report.categoryBreakdown)) {
      console.log(`  ${category}: ${stats.total} tests, Mistral Wins: ${stats.mistralWins}, Groq Wins: ${stats.groqWins}, Ties: ${stats.ties}`);
    }

    console.log('\nDifficulty Breakdown:');
    for (const [difficulty, stats] of Object.entries(report.difficultyBreakdown)) {
      console.log(`  ${difficulty}: ${stats.total} tests, Mistral Wins: ${stats.mistralWins}, Groq Wins: ${stats.groqWins}, Ties: ${stats.ties}`);
    }
  }
}

// Main execution
async function main() {
  const baseUrl = process.argv[2] || 'http://localhost:3000';
  const evaluator = new ChatbotEvaluator(baseUrl);
  
  try {
    const report = await evaluator.runEvaluation();
    evaluator.saveReport(report);
    evaluator.printSummary(report);
  } catch (error) {
    console.error('Evaluation failed:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

export { ChatbotEvaluator };
export type { EvaluationResult, ComparisonReport }; 