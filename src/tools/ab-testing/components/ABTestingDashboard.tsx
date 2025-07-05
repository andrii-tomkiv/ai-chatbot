'use client';

import { useState } from 'react';
import { TestConfiguration, TestResult, ABTestRunner } from '../ab-test-runner';
import { BarChart3, History } from 'lucide-react';
import Link from 'next/link';

export default function ABTestingDashboard() {
  const [testConfigA, setTestConfigA] = useState<TestConfiguration>({
    name: 'Configuration A',
    provider: 'mistral',
    model: 'mistral-small-latest',
    maxTokens: 1000,
    temperature: 0.7,
    maxResults: 5,
    systemPrompt: 'You are a helpful AI assistant for ConceiveAbilities.'
  });

  const [testConfigB, setTestConfigB] = useState<TestConfiguration>({
    name: 'Configuration B',
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    maxTokens: 1000,
    temperature: 0.7,
    maxResults: 5,
    systemPrompt: 'You are a helpful AI assistant for ConceiveAbilities.'
  });

  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [selectedTestCases, setSelectedTestCases] = useState<string[]>([]);
  const [testStrategy, setTestStrategy] = useState<'keywords' | 'sources' | 'llm-evaluation'>('keywords');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');

  const providers = [
    { id: 'mistral', name: 'Mistral' },
    { id: 'groq', name: 'Groq' }
  ];

  const models = {
    mistral: [
      { id: 'mistral-small-latest', name: 'Mistral Small Latest' },
      { id: 'mistral-large-latest', name: 'Mistral Large Latest' }
    ],
    groq: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile' },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B' }
    ]
  };

  const categories = [
    'General', 'Medical & Health', 'Legal & Contracts', 'Pricing & Costs',
    'Compensation & Benefits', 'Insurance & Coverage', 'Requirements & Eligibility',
    'Process & Timeline'
  ];

  const handleConfigChange = (
    config: 'A' | 'B',
    field: keyof TestConfiguration,
    value: string | number
  ) => {
    const setConfig = config === 'A' ? setTestConfigA : setTestConfigB;
    setConfig((prev: TestConfiguration) => ({
      ...prev,
      [field]: value
    }));
  };

  const runABTest = async () => {
    setIsRunning(true);
    setResults([]);
    setError(null);
    setProgress(0);
    setProgressMessage('');
    
    try {
      const runner = new ABTestRunner();
      runner.setProgressCallback((progress, message) => {
        setProgress(progress);
        setProgressMessage(message);
      });
      
      const testResults = await runner.runTest(
        testConfigA,
        testConfigB,
        selectedTestCases,
        testStrategy
      );
      setResults(testResults);
    } catch (error) {
      console.error('A/B test failed:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsRunning(false);
      setProgress(0);
      setProgressMessage('');
    }
  };

  const calculateWinRate = (winner: 'A' | 'B' | 'tie') => {
    const totalResults = results.length;
    if (totalResults === 0) return 0;
    
    const wins = results.filter(r => r.winner === winner).length;
    return (wins / totalResults) * 100;
  };

  const getAverageScore = (config: 'A' | 'B') => {
    if (results.length === 0) return 0;
    
    const scores = results.map(r => 
      config === 'A' ? r.configA.scores.helpfulness : r.configB.scores.helpfulness
    );
    
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-6 border border-conab-header/20 shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-conab-header">A/B Testing Dashboard</h2>
          <Link
            href="/dashboard/ab-testing"
            className="flex items-center gap-2 px-4 py-2 bg-conab-middle-blue text-white rounded-lg hover:bg-conab-middle-blue/80 transition-colors"
          >
            <History className="w-4 h-4" />
            View Results History
          </Link>
        </div>
        
        {/* Configuration Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Configuration A */}
          <div className="border border-conab-action/30 rounded-lg p-4 shadow-sm">
            <h3 className="text-lg font-semibold text-conab-header mb-4 text-center bg-gradient-to-r from-conab-action/10 to-conab-action-lighten/10 py-2 rounded border-l-4 border-conab-action">
              Configuration A
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-conab-header mb-2">Name</label>
                <input
                  type="text"
                  value={testConfigA.name}
                  onChange={(e) => handleConfigChange('A', 'name', e.target.value)}
                  className="w-full text-conab-header px-3 py-2 border border-conab-header/30 rounded-md focus:outline-none focus:ring-2 focus:ring-conab-action focus:border-conab-action"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-conab-header mb-2">Provider</label>
                <select
                  value={testConfigA.provider}
                  onChange={(e) => handleConfigChange('A', 'provider', e.target.value)}
                  className="w-full text-conab-header px-3 py-2 border border-conab-header/30 rounded-md focus:outline-none focus:ring-2 focus:ring-conab-action focus:border-conab-action"
                >
                  {providers.map(provider => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-conab-header mb-2">Model</label>
                <select
                  value={testConfigA.model}
                  onChange={(e) => handleConfigChange('A', 'model', e.target.value)}
                  className="w-full text-conab-header px-3 py-2 border border-conab-header/30 rounded-md focus:outline-none focus:ring-2 focus:ring-conab-action focus:border-conab-action"
                >
                  {models[testConfigA.provider as keyof typeof models]?.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-conab-header mb-2">Max Tokens</label>
                  <input
                    type="number"
                    value={testConfigA.maxTokens}
                    onChange={(e) => handleConfigChange('A', 'maxTokens', parseInt(e.target.value))}
                    className="w-full text-conab-header px-3 py-2 border border-conab-header/30 rounded-md focus:outline-none focus:ring-2 focus:ring-conab-action focus:border-conab-action"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-conab-header mb-2">Temperature</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    value={testConfigA.temperature}
                    onChange={(e) => handleConfigChange('A', 'temperature', parseFloat(e.target.value))}
                    className="w-full text-conab-header px-3 py-2 border border-conab-header/30 rounded-md focus:outline-none focus:ring-2 focus:ring-conab-action focus:border-conab-action"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-conab-header mb-2">Max Results</label>
                <input
                  type="number"
                  value={testConfigA.maxResults}
                  onChange={(e) => handleConfigChange('A', 'maxResults', parseInt(e.target.value))}
                  className="w-full text-conab-header px-3 py-2 border border-conab-header/30 rounded-md focus:outline-none focus:ring-2 focus:ring-conab-action focus:border-conab-action"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-conab-header mb-2">System Prompt</label>
                <textarea
                  value={testConfigA.systemPrompt}
                  onChange={(e) => handleConfigChange('A', 'systemPrompt', e.target.value)}
                  rows={3}
                  className="w-full text-conab-header px-3 py-2 border border-conab-header/30 rounded-md focus:outline-none focus:ring-2 focus:ring-conab-action focus:border-conab-action"
                />
              </div>
            </div>
          </div>

          {/* Configuration B */}
          <div className="border border-conab-green/30 rounded-lg p-4 shadow-sm">
            <h3 className="text-lg font-semibold text-conab-header mb-4 text-center bg-gradient-to-r from-conab-green/10 to-conab-green/20 py-2 rounded border-l-4 border-conab-green">
              Configuration B
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-conab-header mb-2">Name</label>
                <input
                  type="text"
                  value={testConfigB.name}
                  onChange={(e) => handleConfigChange('B', 'name', e.target.value)}
                  className="w-full text-conab-header px-3 py-2 border border-conab-header/30 rounded-md focus:outline-none focus:ring-2 focus:ring-conab-green focus:border-conab-green"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-conab-header mb-2">Provider</label>
                <select
                  value={testConfigB.provider}
                  onChange={(e) => handleConfigChange('B', 'provider', e.target.value)}
                  className="w-full text-conab-header px-3 py-2 border border-conab-header/30 rounded-md focus:outline-none focus:ring-2 focus:ring-conab-green focus:border-conab-green"
                >
                  {providers.map(provider => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-conab-header mb-2">Model</label>
                <select
                  value={testConfigB.model}
                  onChange={(e) => handleConfigChange('B', 'model', e.target.value)}
                  className="w-full text-conab-header px-3 py-2 border border-conab-header/30 rounded-md focus:outline-none focus:ring-2 focus:ring-conab-green focus:border-conab-green"
                >
                  {models[testConfigB.provider as keyof typeof models]?.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-conab-header mb-2">Max Tokens</label>
                  <input
                    type="number"
                    value={testConfigB.maxTokens}
                    onChange={(e) => handleConfigChange('B', 'maxTokens', parseInt(e.target.value))}
                    className="w-full text-conab-header px-3 py-2 border border-conab-header/30 rounded-md focus:outline-none focus:ring-2 focus:ring-conab-green focus:border-conab-green"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-conab-header mb-2">Temperature</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    value={testConfigB.temperature}
                    onChange={(e) => handleConfigChange('B', 'temperature', parseFloat(e.target.value))}
                    className="w-full text-conab-header px-3 py-2 border border-conab-header/30 rounded-md focus:outline-none focus:ring-2 focus:ring-conab-green focus:border-conab-green"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-conab-header mb-2">Max Results</label>
                <input
                  type="number"
                  value={testConfigB.maxResults}
                  onChange={(e) => handleConfigChange('B', 'maxResults', parseInt(e.target.value))}
                  className="w-full text-conab-header px-3 py-2 border border-conab-header/30 rounded-md focus:outline-none focus:ring-2 focus:ring-conab-green focus:border-conab-green"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-conab-header mb-2">System Prompt</label>
                <textarea
                  value={testConfigB.systemPrompt}
                  onChange={(e) => handleConfigChange('B', 'systemPrompt', e.target.value)}
                  rows={3}
                  className="w-full text-conab-header px-3 py-2 border border-conab-header/30 rounded-md focus:outline-none focus:ring-2 focus:ring-conab-green focus:border-conab-green"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Test Strategy and Category Selection */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-conab-header mb-2">Evaluation Strategy</label>
            <select
              value={testStrategy}
              onChange={(e) => setTestStrategy(e.target.value as 'keywords' | 'sources' | 'llm-evaluation')}
              className="w-full text-conab-header px-3 py-2 border border-conab-header/30 rounded-md focus:outline-none focus:ring-2 focus:ring-conab-action focus:border-conab-action"
            >
              <option value="keywords">Keywords Matching</option>
              <option value="sources">Source Accuracy</option>
              <option value="llm-evaluation">LLM-based Evaluation</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-conab-header mb-2">Test Categories</label>
            <select
              multiple
              value={selectedTestCases}
              onChange={(e) => setSelectedTestCases(Array.from(e.target.selectedOptions, option => option.value))}
              className="w-full text-conab-header px-3 py-2 border border-conab-header/30 rounded-md focus:outline-none focus:ring-2 focus:ring-conab-action focus:border-conab-action"
              size={4}
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Run Test Button */}
        <div className="flex flex-col items-center mb-6">
          <button
            onClick={runABTest}
            disabled={isRunning || selectedTestCases.length === 0}
            className={`px-6 py-3 rounded-xl font-medium text-white transition-all duration-200 ${
              isRunning || selectedTestCases.length === 0
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-conab-action to-conab-action-lighten hover:from-conab-action-lighten hover:to-conab-action shadow-lg hover:shadow-xl hover:scale-105'
            }`}
          >
            {isRunning ? 'Running Test...' : 'Run A/B Test'}
          </button>
          
          {/* Progress Bar */}
          {isRunning && (
            <div className="mt-4 w-full max-w-md">
              <div className="bg-gray-200 rounded-full h-2 mb-2">
                <div 
                  className="bg-gradient-to-r from-conab-action to-conab-action-lighten h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-conab-header text-center">{progressMessage}</p>
            </div>
          )}
          
          {selectedTestCases.length === 0 && (
            <p className="text-sm text-conab-header/60 mt-2">Please select at least one category to run the test</p>
          )}
          {error && (
            <div className="mt-4 p-4 bg-conab-action/10 border border-conab-action/30 rounded-xl">
              <p className="text-sm text-conab-action">{error}</p>
            </div>
          )}
        </div>

        {/* Results Section */}
        {results.length > 0 && (
          <div className="mt-8">
            <h3 className="text-xl font-semibold text-conab-header mb-4">Test Results</h3>
            
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-br from-conab-action/10 to-conab-action-lighten/10 p-4 rounded-xl border border-conab-action/20 shadow-sm">
                <div className="text-2xl font-bold text-conab-action">{calculateWinRate('A').toFixed(1)}%</div>
                <div className="text-sm text-conab-header/70">Config A Win Rate</div>
              </div>
              <div className="bg-gradient-to-br from-conab-green/10 to-conab-green/20 p-4 rounded-xl border border-conab-green/20 shadow-sm">
                <div className="text-2xl font-bold text-conab-green">{calculateWinRate('B').toFixed(1)}%</div>
                <div className="text-sm text-conab-header/70">Config B Win Rate</div>
              </div>
              <div className="bg-gradient-to-br from-conab-header/10 to-conab-middle-blue/10 p-4 rounded-xl border border-conab-header/20 shadow-sm">
                <div className="text-2xl font-bold text-conab-header">{calculateWinRate('tie').toFixed(1)}%</div>
                <div className="text-sm text-conab-header/70">Tie Rate</div>
              </div>
              <div className="bg-gradient-to-br from-conab-light-background to-white p-4 rounded-xl border border-conab-header/20 shadow-sm">
                <div className="text-2xl font-bold text-conab-header">{results.length}</div>
                <div className="text-sm text-conab-header/70">Total Tests</div>
              </div>
            </div>

            {/* Average Scores */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-white border border-conab-action/20 rounded-xl p-4 shadow-sm">
                <h4 className="font-semibold text-conab-header mb-2">Configuration A Average</h4>
                <div className="text-2xl font-bold text-conab-action">{getAverageScore('A').toFixed(2)}/5</div>
              </div>
              <div className="bg-white border border-conab-green/20 rounded-xl p-4 shadow-sm">
                <h4 className="font-semibold text-conab-header mb-2">Configuration B Average</h4>
                <div className="text-2xl font-bold text-conab-green">{getAverageScore('B').toFixed(2)}/5</div>
              </div>
            </div>

            {/* Detailed Results */}
            <div className="bg-white border border-conab-header/20 rounded-xl overflow-hidden shadow-sm">
              <div className="px-4 py-3 bg-gradient-to-r from-conab-header to-conab-middle-blue border-b border-conab-header/20">
                <h4 className="font-semibold text-white">Detailed Results</h4>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {results.map((result, index) => (
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
        )}
      </div>
    </div>
  );
} 