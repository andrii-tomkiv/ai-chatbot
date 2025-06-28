'use client';

import { useState, useEffect } from 'react';
import { getProviderStatus, switchToProvider } from '@/lib/llm-provider';

interface ProviderStatusProps {
  className?: string;
}

export default function ProviderStatus({ className = '' }: ProviderStatusProps) {
  const [status, setStatus] = useState<{
    current: string;
    fallback: string;
    available: string[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Get initial status
    try {
      const currentStatus = getProviderStatus();
      setStatus(currentStatus);
    } catch (error) {
      console.error('Failed to get provider status:', error);
    }
  }, []);

  const handleSwitchProvider = async (providerName: string) => {
    if (providerName === status?.current) return;
    
    setIsLoading(true);
    try {
      switchToProvider(providerName);
      setStatus(prev => prev ? { ...prev, current: providerName } : null);
      console.log(`Switched to provider: ${providerName}`);
    } catch (error) {
      console.error('Failed to switch provider:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!status) {
    return (
      <div className={`text-sm text-gray-500 ${className}`}>
        Loading provider status...
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-2 p-3 bg-gray-50 rounded-lg border ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">AI Provider</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Current:</span>
          <span className={`px-2 py-1 text-xs rounded-full ${
            status.current === 'mistral' 
              ? 'bg-blue-100 text-blue-800' 
              : status.current === 'groq'
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {status.current}
          </span>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-1">
        {status.available.map((provider) => (
          <button
            key={provider}
            onClick={() => handleSwitchProvider(provider)}
            disabled={isLoading || provider === status.current}
            className={`px-2 py-1 text-xs rounded border transition-colors ${
              provider === status.current
                ? 'bg-blue-500 text-white border-blue-500 cursor-default'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            {provider}
          </button>
        ))}
      </div>
      
      <div className="text-xs text-gray-500">
        Fallback: <span className="font-medium">{status.fallback}</span>
      </div>
      
      {isLoading && (
        <div className="text-xs text-blue-600">
          Switching provider...
        </div>
      )}
    </div>
  );
} 