'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { LLMProvider as LLMProviderInterface, getLLMProvider } from '@/lib/llm-provider';

interface LLMContextType {
  llmProvider: LLMProviderInterface;
}

const LLMContext = createContext<LLMContextType | undefined>(undefined);

interface LLMProviderProps {
  children: ReactNode;
  provider?: LLMProviderInterface;
}

export function LLMProvider({ children, provider }: LLMProviderProps) {
  const llmProvider = provider || getLLMProvider();

  return (
    <LLMContext.Provider value={{ llmProvider }}>
      {children}
    </LLMContext.Provider>
  );
}

export function useLLM() {
  const context = useContext(LLMContext);
  if (context === undefined) {
    throw new Error('useLLM must be used within an LLMProvider');
  }
  return context.llmProvider;
} 