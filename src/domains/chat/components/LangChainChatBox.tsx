'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Message } from '@/app/langchain-actions';
import { generateResponseWithChain, generateResponseWithAgent } from '@/app/langchain-actions';

interface LangChainChatBoxProps {
  className?: string;
}

export function LangChainChatBox({ className = '' }: LangChainChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chainType, setChainType] = useState<'conversation' | 'qa' | 'custom'>('conversation');
  const [useAgents, setUseAgents] = useState(false);
  const [agentType, setAgentType] = useState<'react' | 'tool-calling' | 'custom'>('react');
  const [model, setModel] = useState<string>('mistral-small-latest');
  const [temperature, setTemperature] = useState<number>(0.7);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setInput('');

    try {
      let response;
      
      if (useAgents) {
        response = await generateResponseWithAgent([userMessage], agentType);
      } else {
        response = await generateResponseWithChain(
          [userMessage],
          chainType,
          'You are a helpful AI assistant. Provide accurate and helpful responses.'
        );
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div>
          <h2 className="text-lg font-semibold">LangChain Chat</h2>
          <p className="text-sm text-gray-600">
            {useAgents ? `Agent: ${agentType}` : `Chain: ${chainType}`} | Model: {model}
          </p>
        </div>
        <button
          onClick={handleClearChat}
          className="px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
        >
          Clear Chat
        </button>
      </div>

      {/* Settings Panel */}
      <div className="p-4 border-b bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Chain/Agent Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mode
            </label>
            <div className="flex space-x-2">
              <button
                onClick={() => setUseAgents(false)}
                className={`px-3 py-1 text-sm rounded ${
                  !useAgents
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Chains
              </button>
              <button
                onClick={() => setUseAgents(true)}
                className={`px-3 py-1 text-sm rounded ${
                  useAgents
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Agents
              </button>
            </div>
          </div>

          {/* Chain Type */}
          {!useAgents && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chain Type
              </label>
              <select
                value={chainType}
                onChange={(e) => setChainType(e.target.value as any)}
                className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="conversation">Conversation</option>
                <option value="qa">Q&A</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          )}

          {/* Agent Type */}
          {useAgents && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Agent Type
              </label>
              <select
                value={agentType}
                onChange={(e) => setAgentType(e.target.value as any)}
                className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="react">ReAct</option>
                <option value="tool-calling">Tool Calling</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          )}

          {/* Model Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Model
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="mistral-small-latest">Mistral Small</option>
              <option value="mistral-medium-latest">Mistral Medium</option>
              <option value="mistral-large-latest">Mistral Large</option>
              <option value="llama3-70b-8192">Groq Llama 3.1 70B</option>
              <option value="llama3-8b-8192">Groq Llama 3.1 8B</option>
            </select>
          </div>

          {/* Temperature */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Temperature: {temperature}
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div className={`max-w-xs lg:max-w-md xl:max-w-lg px-4 py-2 rounded-lg ${
              message.role === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-800'
            }`}>
              <div className="text-sm">{message.content}</div>
              {message.timestamp && (
                <div className="text-xs opacity-70 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-white">
        <div className="flex space-x-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              useAgents
                ? `Ask me anything (using ${agentType} agent)...`
                : `Ask me anything (using ${chainType} chain)...`
            }
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
} 