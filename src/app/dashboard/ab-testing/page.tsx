'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Clock, FileText, TrendingUp, Trophy } from 'lucide-react';
import Link from 'next/link';

interface ResultFile {
  filename: string;
  isABTest: boolean;
  configAName: string;
  configBName: string;
  timestamp: string;
  size: number;
  modified: string;
}

interface TestResult {
  testCaseId: string;
  category: string;
  difficulty: string;
  question: string;
  configA: {
    answer: string;
    sources: string[];
    executionTime: number;
    scores: {
      accuracy: number;
      completeness: number;
      helpfulness: number;
    };
  };
  configB: {
    answer: string;
    sources: string[];
    executionTime: number;
    scores: {
      accuracy: number;
      completeness: number;
      helpfulness: number;
    };
  };
  winner: 'A' | 'B' | 'tie';
  scoreDifference: number;
}

interface ABTestReport {
  timestamp: string;
  configurations: {
    A: any;
    B: any;
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

export default function ABTestingResultsPage() {
  const [resultFiles, setResultFiles] = useState<ResultFile[]>([]);
  const [selectedResult, setSelectedResult] = useState<ABTestReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadResultFiles();
  }, []);

  const loadResultFiles = async () => {
    try {
      const response = await fetch('/api/ab-test-results');
      if (!response.ok) {
        throw new Error('Failed to load results');
      }
      const data = await response.json();
      setResultFiles(data.results.filter((f: ResultFile) => f.isABTest));
    } catch (error) {
      console.error('Error loading result files:', error);
      setError('Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  const loadResultDetail = async (filename: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ab-test-results/${filename}`);
      if (!response.ok) {
        throw new Error('Failed to load result detail');
      }
      const data = await response.json();
      setSelectedResult(data);
    } catch (error) {
      console.error('Error loading result detail:', error);
      setError('Failed to load result detail');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatFileSize = (bytes: number) => {
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const calculateWinRate = (winner: 'A' | 'B' | 'tie', results: TestResult[]) => {
    const totalResults = results.length;
    if (totalResults === 0) return 0;
    
    const wins = results.filter(r => r.winner === winner).length;
    return (wins / totalResults) * 100;
  };

  const getAverageScore = (config: 'A' | 'B', results: TestResult[]) => {
    if (results.length === 0) return 0;
    
    const scores = results.map(r => 
      config === 'A' ? r.configA.scores.helpfulness : r.configB.scores.helpfulness
    );
    
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  };

  if (loading && !selectedResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-conab-light-background via-white to-conab-light-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-conab-action mx-auto"></div>
            <p className="mt-4 text-conab-header">Loading A/B test results...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-conab-light-background via-white to-conab-light-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-conab-action">Error: {error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-conab-action text-white rounded-lg hover:bg-conab-action/80"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (selectedResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-conab-light-background via-white to-conab-light-background">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <button
              onClick={() => setSelectedResult(null)}
              className="flex items-center gap-2 text-conab-header hover:text-conab-action transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Results List
            </button>
          </div>

          <div className="bg-white rounded-lg p-6 border border-conab-header/20 shadow-lg">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-conab-header mb-2">
                {selectedResult.configurations.A.name} vs {selectedResult.configurations.B.name}
              </h2>
              <div className="text-sm text-conab-header/60">
                <p>Tested on {formatDate(selectedResult.timestamp)}</p>
                <p>Strategy: {selectedResult.evaluationStrategy}</p>
                <p>Execution Time: {Math.round(selectedResult.summary.executionTime / 1000)}s</p>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-br from-conab-action/10 to-conab-action-lighten/10 p-4 rounded-xl border border-conab-action/20 shadow-sm">
                <div className="text-2xl font-bold text-conab-action">
                  {calculateWinRate('A', selectedResult.results).toFixed(1)}%
                </div>
                <div className="text-sm text-conab-header/70">Config A Win Rate</div>
              </div>
              <div className="bg-gradient-to-br from-conab-green/10 to-conab-green/20 p-4 rounded-xl border border-conab-green/20 shadow-sm">
                <div className="text-2xl font-bold text-conab-green">
                  {calculateWinRate('B', selectedResult.results).toFixed(1)}%
                </div>
                <div className="text-sm text-conab-header/70">Config B Win Rate</div>
              </div>
              <div className="bg-gradient-to-br from-conab-header/10 to-conab-middle-blue/10 p-4 rounded-xl border border-conab-header/20 shadow-sm">
                <div className="text-2xl font-bold text-conab-header">
                  {calculateWinRate('tie', selectedResult.results).toFixed(1)}%
                </div>
                <div className="text-sm text-conab-header/70">Tie Rate</div>
              </div>
              <div className="bg-gradient-to-br from-conab-light-background to-white p-4 rounded-xl border border-conab-header/20 shadow-sm">
                <div className="text-2xl font-bold text-conab-header">{selectedResult.results.length}</div>
                <div className="text-sm text-conab-header/70">Total Tests</div>
              </div>
            </div>

            {/* Average Scores */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-white border border-conab-action/20 rounded-xl p-4 shadow-sm">
                <h4 className="font-semibold text-conab-header mb-2">Configuration A Average</h4>
                <div className="text-2xl font-bold text-conab-action">
                  {getAverageScore('A', selectedResult.results).toFixed(2)}/5
                </div>
              </div>
              <div className="bg-white border border-conab-green/20 rounded-xl p-4 shadow-sm">
                <h4 className="font-semibold text-conab-header mb-2">Configuration B Average</h4>
                <div className="text-2xl font-bold text-conab-green">
                  {getAverageScore('B', selectedResult.results).toFixed(2)}/5
                </div>
              </div>
            </div>

            {/* Detailed Results */}
            <div className="bg-white border border-conab-header/20 rounded-xl overflow-hidden shadow-sm">
              <div className="px-4 py-3 bg-gradient-to-r from-conab-header to-conab-middle-blue border-b border-conab-header/20">
                <h4 className="font-semibold text-white">Detailed Results</h4>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {selectedResult.results.map((result, index) => (
                  <div key={index} className="px-4 py-3 border-b border-conab-header/10 last:border-b-0 hover:bg-conab-light-background/30 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="font-medium text-conab-header">{result.question}</div>
                        <div className="text-sm text-conab-header/60">{result.category} • {result.difficulty}</div>
                      </div>
                      <div className={`px-2 py-1 rounded-lg text-xs font-medium ${
                        result.winner === 'A' ? 'bg-conab-action/20 text-conab-action border border-conab-action/30' :
                        result.winner === 'B' ? 'bg-conab-green/20 text-conab-green border border-conab-green/30' :
                        'bg-conab-header/10 text-conab-header border border-conab-header/20'
                      }`}>
                        {result.winner === 'A' ? 'Config A Wins' : 
                         result.winner === 'B' ? 'Config B Wins' : 'Tie'}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-conab-action">A:</span> {result.configA.scores.helpfulness}/5
                      </div>
                      <div>
                        <span className="font-medium text-conab-green">B:</span> {result.configB.scores.helpfulness}/5
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-conab-light-background via-white to-conab-light-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-conab-header hover:text-conab-action transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Dashboard
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-conab-header mb-2">A/B Testing Results</h1>
          <p className="text-conab-header/70">View and analyze your A/B test results</p>
        </div>

        {resultFiles.length === 0 ? (
          <div className="bg-white rounded-lg p-8 border border-conab-header/20 shadow-sm text-center">
            <FileText className="w-12 h-12 text-conab-header/40 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-conab-header mb-2">No A/B Test Results Found</h3>
            <p className="text-conab-header/60 mb-4">
              You haven't run any A/B tests yet. Go back to the dashboard to create your first test.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 bg-conab-action text-white rounded-lg hover:bg-conab-action/80 transition-colors"
            >
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resultFiles.map((file, index) => (
              <div
                key={index}
                className="bg-white rounded-lg p-6 border border-conab-header/20 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => loadResultDetail(file.filename)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-conab-action" />
                    <span className="font-semibold text-conab-header">A/B Test</span>
                  </div>
                  <div className="text-xs text-conab-header/60">
                    {formatFileSize(file.size)}
                  </div>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-conab-action">A:</span>
                    <span className="text-conab-header">{file.configAName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-conab-green">B:</span>
                    <span className="text-conab-header">{file.configBName}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-conab-header/60">
                  <Clock className="w-4 h-4" />
                  {formatDate(file.modified)}
                </div>

                <div className="mt-4 pt-4 border-t border-conab-header/10">
                  <div className="flex items-center gap-2 text-conab-action hover:text-conab-action/80 transition-colors">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-sm font-medium">View Results</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 