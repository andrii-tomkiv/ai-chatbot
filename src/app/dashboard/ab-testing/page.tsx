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
    sources: Array<string | {url: string; title: string}>;
    executionTime: number;
    scores: {
      accuracy: number;
      completeness: number;
      helpfulness: number;
    };
  };
  configB: {
    answer: string;
    sources: Array<string | {url: string; title: string}>;
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
        faithfulness?: number;
      };
      configB: {
        accuracy: number;
        completeness: number;
        helpfulness: number;
        faithfulness?: number;
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

  const getAverageFaithfulness = (config: 'A' | 'B', results: TestResult[]) => {
    if (results.length === 0) return 0;
    
    const scores = results.map(r => 
      config === 'A' ? r.configA.scores.accuracy : r.configB.scores.accuracy
    );
    
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  };

  const isLLMEvaluation = (report: ABTestReport) => {
    return report.evaluationStrategy === 'llm-evaluation';
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

            {/* Configuration Details */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-conab-header mb-4">Configuration Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-conab-action/20 rounded-xl p-4 shadow-sm">
                  <h4 className="font-semibold text-conab-action mb-3">Configuration A</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium text-conab-header">Name:</span> {selectedResult.configurations.A.name}</div>
                    <div><span className="font-medium text-conab-header">Provider:</span> {selectedResult.configurations.A.provider}</div>
                    <div><span className="font-medium text-conab-header">Model:</span> {selectedResult.configurations.A.model}</div>
                    <div><span className="font-medium text-conab-header">Max Tokens:</span> {selectedResult.configurations.A.maxTokens}</div>
                    <div><span className="font-medium text-conab-header">Temperature:</span> {selectedResult.configurations.A.temperature}</div>
                    <div><span className="font-medium text-conab-header">Max Results:</span> {selectedResult.configurations.A.maxResults}</div>
                    <div><span className="font-medium text-conab-header">Average Score:</span> {selectedResult.summary.averageScores.configA.helpfulness?.toFixed(2) || 'N/A'}/5</div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-conab-action/20">
                    <div className="font-medium text-conab-header mb-2">System Prompt:</div>
                    <div className="bg-conab-light-background/50 p-3 rounded-lg border border-conab-action/20 text-xs text-conab-header leading-relaxed max-h-40 overflow-y-auto">
                      {selectedResult.configurations.A.systemPrompt}
                    </div>
                  </div>
                </div>
                <div className="bg-white border border-conab-green/20 rounded-xl p-4 shadow-sm">
                  <h4 className="font-semibold text-conab-green mb-3">Configuration B</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium text-conab-header">Name:</span> {selectedResult.configurations.B.name}</div>
                    <div><span className="font-medium text-conab-header">Provider:</span> {selectedResult.configurations.B.provider}</div>
                    <div><span className="font-medium text-conab-header">Model:</span> {selectedResult.configurations.B.model}</div>
                    <div><span className="font-medium text-conab-header">Max Tokens:</span> {selectedResult.configurations.B.maxTokens}</div>
                    <div><span className="font-medium text-conab-header">Temperature:</span> {selectedResult.configurations.B.temperature}</div>
                    <div><span className="font-medium text-conab-header">Max Results:</span> {selectedResult.configurations.B.maxResults}</div>
                    <div><span className="font-medium text-conab-header">Average Score:</span> {selectedResult.summary.averageScores.configB.helpfulness?.toFixed(2) || 'N/A'}/5</div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-conab-green/20">
                    <div className="font-medium text-conab-header mb-2">System Prompt:</div>
                    <div className="bg-conab-light-background/50 p-3 rounded-lg border border-conab-green/20 text-xs text-conab-header leading-relaxed max-h-40 overflow-y-auto">
                      {selectedResult.configurations.B.systemPrompt}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-conab-header mb-4">Category Breakdown</h3>
              <div className="bg-white border border-conab-header/20 rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 bg-gradient-to-r from-conab-header to-conab-middle-blue border-b border-conab-header/20">
                  <div className="grid grid-cols-6 gap-4 text-white text-sm font-medium">
                    <div>Category</div>
                    <div>Total</div>
                    <div>A Wins</div>
                    <div>B Wins</div>
                    <div>Ties</div>
                    <div>Avg Score Diff</div>
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {Object.entries(selectedResult.categoryBreakdown).map(([category, breakdown]: [string, any]) => (
                    <div key={category} className="px-4 py-3 border-b border-conab-header/10 last:border-b-0 hover:bg-conab-light-background/30 transition-colors">
                      <div className="grid grid-cols-6 gap-4 text-sm">
                        <div className="font-medium text-conab-header">{category}</div>
                        <div className="text-conab-header">{breakdown.total}</div>
                        <div className="text-conab-action">{breakdown.configAWins}</div>
                        <div className="text-conab-green">{breakdown.configBWins}</div>
                        <div className="text-conab-header">{breakdown.ties}</div>
                        <div className="text-conab-header">{Math.abs((breakdown.averageConfigAScore || 0) - (breakdown.averageConfigBScore || 0)).toFixed(2)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Difficulty Breakdown */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-conab-header mb-4">Difficulty Breakdown</h3>
              <div className="bg-white border border-conab-header/20 rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 bg-gradient-to-r from-conab-header to-conab-middle-blue border-b border-conab-header/20">
                  <div className="grid grid-cols-6 gap-4 text-white text-sm font-medium">
                    <div>Difficulty</div>
                    <div>Total</div>
                    <div>A Wins</div>
                    <div>B Wins</div>
                    <div>Ties</div>
                    <div>Avg Score Diff</div>
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {Object.entries(selectedResult.difficultyBreakdown).map(([difficulty, breakdown]: [string, any]) => (
                    <div key={difficulty} className="px-4 py-3 border-b border-conab-header/10 last:border-b-0 hover:bg-conab-light-background/30 transition-colors">
                      <div className="grid grid-cols-6 gap-4 text-sm">
                        <div className="font-medium text-conab-header">{difficulty}</div>
                        <div className="text-conab-header">{breakdown.total}</div>
                        <div className="text-conab-action">{breakdown.configAWins}</div>
                        <div className="text-conab-green">{breakdown.configBWins}</div>
                        <div className="text-conab-header">{breakdown.ties}</div>
                        <div className="text-conab-header">{Math.abs((breakdown.averageConfigAScore || 0) - (breakdown.averageConfigBScore || 0)).toFixed(2)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Detailed Summary */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-conab-header mb-4">Detailed Summary</h3>
              <div className="bg-white border border-conab-header/20 rounded-xl p-4 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-conab-header">Evaluation Strategy:</span>
                    <div className="text-conab-action capitalize">{selectedResult.evaluationStrategy}</div>
                  </div>
                  <div>
                    <span className="font-medium text-conab-header">Test Timestamp:</span>
                    <div className="text-conab-header">{formatDate(selectedResult.timestamp)}</div>
                  </div>
                  <div>
                    <span className="font-medium text-conab-header">Execution Time:</span>
                    <div className="text-conab-header">{Math.round(selectedResult.summary.executionTime / 1000)}s</div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-conab-header/10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="font-medium text-conab-header">Configuration A Detailed Scores:</span>
                      <div className="mt-2 space-y-1 text-sm">
                        {isLLMEvaluation(selectedResult) ? (
                          <>
                            <div>Faithfulness: {selectedResult.summary.averageScores.configA.accuracy?.toFixed(2) || 'N/A'}/5</div>
                            <div>Helpfulness: {selectedResult.summary.averageScores.configA.helpfulness?.toFixed(2) || 'N/A'}/5</div>
                          </>
                        ) : (
                          <>
                            <div>Accuracy: {selectedResult.summary.averageScores.configA.accuracy?.toFixed(2) || 'N/A'}/5</div>
                            <div>Completeness: {selectedResult.summary.averageScores.configA.completeness?.toFixed(2) || 'N/A'}/5</div>
                            <div>Helpfulness: {selectedResult.summary.averageScores.configA.helpfulness?.toFixed(2) || 'N/A'}/5</div>
                          </>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium text-conab-header">Configuration B Detailed Scores:</span>
                      <div className="mt-2 space-y-1 text-sm">
                        {isLLMEvaluation(selectedResult) ? (
                          <>
                            <div>Faithfulness: {selectedResult.summary.averageScores.configB.accuracy?.toFixed(2) || 'N/A'}/5</div>
                            <div>Helpfulness: {selectedResult.summary.averageScores.configB.helpfulness?.toFixed(2) || 'N/A'}/5</div>
                          </>
                        ) : (
                          <>
                            <div>Accuracy: {selectedResult.summary.averageScores.configB.accuracy?.toFixed(2) || 'N/A'}/5</div>
                            <div>Completeness: {selectedResult.summary.averageScores.configB.completeness?.toFixed(2) || 'N/A'}/5</div>
                            <div>Helpfulness: {selectedResult.summary.averageScores.configB.helpfulness?.toFixed(2) || 'N/A'}/5</div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Results */}
            <div className="bg-white border border-conab-header/20 rounded-xl overflow-hidden shadow-sm">
              <div className="px-4 py-3 bg-gradient-to-r from-conab-header to-conab-middle-blue border-b border-conab-header/20">
                <h4 className="font-semibold text-white">Detailed Results</h4>
              </div>
              <div className="max-h-[600px] overflow-y-auto">
                {selectedResult.results.map((result, index) => (
                  <div key={index} className="px-4 py-4 border-b border-conab-header/10 last:border-b-0 hover:bg-conab-light-background/30 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="font-medium text-conab-header mb-1">{result.question}</div>
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
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="border border-conab-action/20 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-conab-action">Configuration A</span>
                          <span className="text-conab-action font-medium">{result.configA.scores.helpfulness || 'N/A'}/5</span>
                        </div>
                        <div className="text-xs text-conab-header/60 mb-1">
                          {isLLMEvaluation(selectedResult) ? (
                            `Faithfulness: ${result.configA.scores.accuracy || 'N/A'}/5 • Helpfulness: ${result.configA.scores.helpfulness || 'N/A'}/5`
                          ) : (
                            `Accuracy: ${result.configA.scores.accuracy || 'N/A'}/5 • Completeness: ${result.configA.scores.completeness || 'N/A'}/5`
                          )}
                        </div>
                        <div className="text-xs text-conab-header/60 mb-2">
                          Execution: {result.configA.executionTime}ms
                        </div>
                        <div className="bg-conab-light-background/50 p-2 rounded text-xs text-conab-header leading-relaxed max-h-32 overflow-y-auto">
                          {result.configA.answer || 'No answer provided'}
                        </div>
                        {result.configA.sources && result.configA.sources.length > 0 && (
                          <div className="mt-2">
                            <div className="text-xs font-medium text-conab-header/70 mb-1">Sources:</div>
                            <div className="text-xs text-conab-header/60">
                              {result.configA.sources.slice(0, 2).map((source, i) => (
                                <div key={i} className="truncate">• {typeof source === 'string' ? source : (source.title || source.url)}</div>
                              ))}
                              {result.configA.sources.length > 2 && (
                                <div className="text-conab-header/40">+{result.configA.sources.length - 2} more</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="border border-conab-green/20 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-conab-green">Configuration B</span>
                          <span className="text-conab-green font-medium">{result.configB.scores.helpfulness || 'N/A'}/5</span>
                        </div>
                        <div className="text-xs text-conab-header/60 mb-1">
                          {isLLMEvaluation(selectedResult) ? (
                            `Faithfulness: ${result.configB.scores.accuracy || 'N/A'}/5 • Helpfulness: ${result.configB.scores.helpfulness || 'N/A'}/5`
                          ) : (
                            `Accuracy: ${result.configB.scores.accuracy || 'N/A'}/5 • Completeness: ${result.configB.scores.completeness || 'N/A'}/5`
                          )}
                        </div>
                        <div className="text-xs text-conab-header/60 mb-2">
                          Execution: {result.configB.executionTime}ms
                        </div>
                        <div className="bg-conab-light-background/50 p-2 rounded text-xs text-conab-header leading-relaxed max-h-32 overflow-y-auto">
                          {result.configB.answer || 'No answer provided'}
                        </div>
                        {result.configB.sources && result.configB.sources.length > 0 && (
                          <div className="mt-2">
                            <div className="text-xs font-medium text-conab-header/70 mb-1">Sources:</div>
                            <div className="text-xs text-conab-header/60">
                              {result.configB.sources.slice(0, 2).map((source, i) => (
                                <div key={i} className="truncate">• {typeof source === 'string' ? source : (source.title || source.url)}</div>
                              ))}
                              {result.configB.sources.length > 2 && (
                                <div className="text-conab-header/40">+{result.configB.sources.length - 2} more</div>
                              )}
                            </div>
                          </div>
                        )}
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