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

const getTemperaturePresets = (maxTemp: number) => [
  { value: 0.1, label: 'Focused', description: 'Very consistent, factual responses' },
  { value: 0.3, label: 'Balanced', description: 'Good balance of creativity and accuracy' },
  { value: 0.7, label: 'Creative', description: 'More imaginative and varied responses' },
  { value: Math.min(1.0, maxTemp), label: 'Explorative', description: 'Maximum creativity and variety' },
  ...(maxTemp > 1.0 ? [{ value: maxTemp, label: 'Maximum', description: 'Highest possible creativity' }] : [])
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

  const getMaxTemperature = (model: 'mistral' | 'groq') => {
    return model === 'mistral' ? 1.5 : 2.0;
  };

  const selectedModel = modelOptions.find(m => m.id === localSettings.model);
  const maxTemperature = getMaxTemperature(localSettings.model);
  const temperaturePresets = getTemperaturePresets(maxTemperature);

  return (
    <div className="relative">
      {/* Settings Toggle Button */}
      <button
        onClick={onToggle}
        className="flex items-center gap-2 px-4 py-2 text-sm bg-white/20 text-white rounded-xl hover:bg-white/30 transition-all duration-200 hover:scale-105 backdrop-blur-sm"
        title="Chat Settings"
      >
        <Settings className="w-4 h-4" />
        <span className="hidden sm:inline">Settings</span>
      </button>

      {/* Settings Panel */}
      {isOpen && (
        <div className="fixed top-20 right-4 w-80 sm:w-96 max-h-[calc(100vh-6rem)] bg-white/95 backdrop-blur-xl border border-white/50 rounded-3xl shadow-2xl p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-800">Chat Settings</h3>
            <button
              onClick={onToggle}
              className="w-8 h-8 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105"
              title="Close settings"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Model Selection */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Cpu className="w-5 h-5 text-conab-action" />
              <label className="text-sm font-semibold text-gray-700 uppercase tracking-wide">AI Model</label>
            </div>
            <div className="space-y-3">
              {modelOptions.map((option) => (
                <label
                  key={option.id}
                  className={`flex items-center p-4 border-2 rounded-2xl cursor-pointer transition-all duration-200 hover:scale-105 ${
                    localSettings.model === option.id
                      ? 'border-conab-action bg-gradient-to-r from-conab-action/10 to-conab-action-lighten/10 shadow-lg'
                      : 'border-gray-200 hover:border-conab-action/30 hover:bg-gray-50/50'
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
                    <div className="font-bold text-gray-800">{option.name}</div>
                    <div className="text-sm text-gray-600 mt-1">{option.description}</div>
                    <div className="text-xs text-gray-500 mt-2 font-mono">{option.model}</div>
                  </div>
                  {localSettings.model === option.id && (
                    <div className="w-6 h-6 bg-gradient-to-br from-conab-action to-conab-action-lighten rounded-full flex items-center justify-center shadow-lg">
                      <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                    </div>
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Temperature Control */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Thermometer className="w-5 h-5 text-conab-action" />
                <label className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Temperature</label>
              </div>
              <span className="text-lg font-bold text-conab-action">{localSettings.temperature}</span>
            </div>
            
            {/* Temperature Slider */}
            <div className="relative w-full h-10 flex items-center mb-4">
              {/* Track background */}
              <div className="absolute left-0 right-0 h-3 rounded-full bg-gray-200" />
              {/* Filled bar */}
              <div
                className="absolute h-3 rounded-full bg-gradient-to-r from-conab-action to-conab-action-lighten"
                style={{ width: `${(localSettings.temperature / maxTemperature) * 100}%` }}
              />
              <input
                type="range"
                min="0"
                max={maxTemperature}
                step="0.1"
                value={localSettings.temperature}
                onChange={(e) => handleTemperatureChange(parseFloat(e.target.value))}
                className="w-full h-3 appearance-none cursor-pointer slider bg-transparent relative z-10"
              />
            </div>
            
            {/* Temperature Description */}
            <p className="text-sm text-gray-600 mb-3">
              {getTemperatureDescription(localSettings.temperature)}
            </p>

            {/* Temperature Presets */}
            <div className="grid grid-cols-2 gap-2">
              {temperaturePresets.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => handleTemperatureChange(preset.value)}
                  className={`p-3 text-left rounded-xl transition-all duration-200 hover:scale-105 ${
                    Math.abs(localSettings.temperature - preset.value) < 0.05
                      ? 'bg-gradient-to-r from-conab-action/20 to-conab-action-lighten/20 border-2 border-conab-action text-conab-action shadow-lg'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-2 border-transparent'
                  }`}
                >
                  <div className="font-semibold text-sm">{preset.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{preset.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Max Tokens Control */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Max Response Length</label>
              <span className="text-lg font-bold text-conab-action">{localSettings.maxTokens} tokens</span>
            </div>
            <div className="relative w-full h-10 flex items-center">
              {/* Track background */}
              <div className="absolute left-0 right-0 h-3 rounded-full bg-gray-200" />
              {/* Filled bar */}
              <div
                className="absolute h-3 rounded-full bg-gradient-to-r from-conab-action to-conab-action-lighten"
                style={{ width: `${((localSettings.maxTokens - 100) / (2000 - 100)) * 100}%` }}
              />
              <input
                type="range"
                min="100"
                max="2000"
                step="100"
                value={localSettings.maxTokens}
                onChange={(e) => handleMaxTokensChange(parseInt(e.target.value))}
                className="w-full h-3 appearance-none cursor-pointer slider bg-transparent relative z-10"
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>Short</span>
              <span>Long</span>
            </div>
          </div>

          {/* Info Section */}
          <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-conab-action/5 to-conab-action-lighten/5 rounded-2xl border border-conab-action/20">
            <Info className="w-5 h-5 text-conab-action mt-0.5 flex-shrink-0" />
            <div className="text-sm text-gray-700">
              <p className="font-bold mb-2 text-gray-800">Current Settings:</p>
              <div className="space-y-1">
                <p><span className="font-medium">Model:</span> {selectedModel?.name}</p>
                <p><span className="font-medium">Temperature:</span> {localSettings.temperature} ({getTemperatureDescription(localSettings.temperature).toLowerCase()})</p>
                <p><span className="font-medium">Max Tokens:</span> {localSettings.maxTokens}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0"
          onClick={onToggle}
        />
      )}
    </div>
  );
} 