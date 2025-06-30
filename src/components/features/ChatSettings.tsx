'use client';

import { useState, useEffect } from 'react';
import { Settings, Thermometer, Cpu, Info } from 'lucide-react';

export interface ChatSettings {
  temperature: number;
  model: 'mistral' | 'groq';
  maxTokens: number;
}

interface ChatSettingsProps {
  settings: ChatSettings;
  onSettingsChange: (settings: ChatSettings) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const modelOptions = [
  {
    id: 'mistral' as const,
    name: 'Mistral',
    description: 'Fast and reliable responses',
    model: 'mistral-small-latest'
  },
  {
    id: 'groq' as const,
    name: 'Groq',
    description: 'High-speed inference',
    model: 'llama-3.3-70b-versatile'
  }
];

const temperaturePresets = [
  { value: 0.1, label: 'Focused', description: 'Very consistent, factual responses' },
  { value: 0.3, label: 'Balanced', description: 'Good balance of creativity and accuracy' },
  { value: 0.7, label: 'Creative', description: 'More imaginative and varied responses' },
  { value: 1.0, label: 'Explorative', description: 'Maximum creativity and variety' }
];

export default function ChatSettings({ 
  settings, 
  onSettingsChange, 
  isOpen, 
  onToggle 
}: ChatSettingsProps) {
  const [localSettings, setLocalSettings] = useState<ChatSettings>(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleTemperatureChange = (value: number) => {
    const newSettings = { ...localSettings, temperature: value };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const handleModelChange = (model: 'mistral' | 'groq') => {
    const newSettings = { ...localSettings, model };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const handleMaxTokensChange = (value: number) => {
    const newSettings = { ...localSettings, maxTokens: value };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const getTemperatureDescription = (temp: number) => {
    if (temp <= 0.2) return 'Very focused and deterministic';
    if (temp <= 0.5) return 'Balanced and reliable';
    if (temp <= 0.8) return 'Creative and varied';
    return 'Highly creative and explorative';
  };

  const selectedModel = modelOptions.find(m => m.id === localSettings.model);

  return (
    <div className="relative">
      {/* Settings Toggle Button */}
      <button
        onClick={onToggle}
        className="flex items-center gap-2 px-3 py-2 text-sm text-white hover:text-white/80 hover:bg-white/10 rounded-lg transition-colors"
        title="Chat Settings"
      >
        <Settings className="w-4 h-4" />
        <span className="hidden sm:inline">Settings</span>
      </button>

      {/* Settings Panel */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 sm:w-96 bg-conab-light-background border border-conab-middle-blue rounded-lg shadow-lg p-4 z-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-conab-dark-blue">Chat Settings</h3>
            <button
              onClick={onToggle}
              className="text-conab-middle-blue hover:text-conab-action p-1 rounded-full hover:bg-conab-middle-blue/10 transition-colors"
              title="Close settings"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Model Selection */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Cpu className="w-4 h-4 text-conab-middle-blue" />
              <label className="text-sm font-medium text-conab-dark-blue">AI Model</label>
            </div>
            <div className="space-y-2">
              {modelOptions.map((option) => (
                <label
                  key={option.id}
                  className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                    localSettings.model === option.id
                      ? 'border-conab-action bg-conab-action/10'
                      : 'border-conab-middle-blue/30 hover:border-conab-middle-blue/50 hover:bg-conab-middle-blue/5'
                  }`}
                >
                  <input
                    type="radio"
                    name="model"
                    value={option.id}
                    checked={localSettings.model === option.id}
                    onChange={() => handleModelChange(option.id)}
                    className="sr-only"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-conab-dark-blue">{option.name}</div>
                    <div className="text-sm text-conab-middle-blue">{option.description}</div>
                    <div className="text-xs text-conab-middle-blue/70 mt-1">Model: {option.model}</div>
                  </div>
                  {localSettings.model === option.id && (
                    <div className="w-4 h-4 bg-conab-action rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Temperature Control */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-conab-middle-blue" />
                <label className="text-sm font-medium text-conab-dark-blue">Temperature</label>
              </div>
              <span className="text-sm text-conab-middle-blue">{localSettings.temperature}</span>
            </div>
            
            {/* Temperature Slider */}
            <div className="relative w-full h-8 flex items-center">
              {/* Track background */}
              <div className="absolute left-0 right-0 h-2 rounded-lg bg-conab-middle-blue/20" />
              {/* Filled bar */}
              <div
                className="absolute h-2 rounded-lg bg-conab-middle-blue"
                style={{ width: `${localSettings.temperature * 100}%` }}
              />
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={localSettings.temperature}
                onChange={(e) => handleTemperatureChange(parseFloat(e.target.value))}
                className="w-full h-2 appearance-none cursor-pointer slider bg-transparent relative z-10"
              />
            </div>
            
            {/* Temperature Description */}
            <p className="text-xs text-conab-middle-blue/70 mt-2">
              {getTemperatureDescription(localSettings.temperature)}
            </p>

            {/* Temperature Presets */}
            <div className="mt-3 space-y-1">
              {temperaturePresets.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => handleTemperatureChange(preset.value)}
                  className={`block w-full text-left px-2 py-1 text-xs rounded transition-colors ${
                    Math.abs(localSettings.temperature - preset.value) < 0.05
                      ? 'bg-conab-action/20 text-conab-action'
                      : 'text-conab-middle-blue hover:bg-conab-middle-blue/10'
                  }`}
                >
                  <span className="font-medium">{preset.label}</span>
                  <span className="text-conab-middle-blue/70 ml-2">({preset.value})</span>
                  <div className="text-conab-middle-blue/60">{preset.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Max Tokens Control */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-conab-dark-blue">Max Response Length</label>
              <span className="text-sm text-conab-middle-blue">{localSettings.maxTokens} tokens</span>
            </div>
            <div className="relative w-full h-8 flex items-center">
              {/* Track background */}
              <div className="absolute left-0 right-0 h-2 rounded-lg bg-conab-middle-blue/20" />
              {/* Filled bar */}
              <div
                className="absolute h-2 rounded-lg bg-conab-middle-blue"
                style={{ width: `${((localSettings.maxTokens - 100) / (2000 - 100)) * 100}%` }}
              />
              <input
                type="range"
                min="100"
                max="2000"
                step="100"
                value={localSettings.maxTokens}
                onChange={(e) => handleMaxTokensChange(parseInt(e.target.value))}
                className="w-full h-2 appearance-none cursor-pointer slider bg-transparent relative z-10"
              />
            </div>
            <div className="flex justify-between text-xs text-conab-middle-blue/70 mt-1">
              <span>Short</span>
              <span>Long</span>
            </div>
          </div>

          {/* Info Section */}
          <div className="flex items-start gap-2 p-3 bg-conab-middle-blue/5 rounded-lg border border-conab-middle-blue/20">
            <Info className="w-4 h-4 text-conab-middle-blue mt-0.5 flex-shrink-0" />
            <div className="text-xs text-conab-middle-blue">
              <p className="font-medium mb-1 text-conab-dark-blue">Current Settings:</p>
              <p>Model: {selectedModel?.name} ({selectedModel?.model})</p>
              <p>Temperature: {localSettings.temperature} ({getTemperatureDescription(localSettings.temperature).toLowerCase()})</p>
              <p>Max Tokens: {localSettings.maxTokens}</p>
            </div>
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={onToggle}
        />
      )}
    </div>
  );
} 