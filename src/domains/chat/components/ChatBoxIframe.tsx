'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Message, continueConversation } from '@/app/actions';
import { readStreamableValue } from 'ai/rsc';
import { saveChatHistory, loadChatHistory, clearChatHistory } from './ChatHistory';
import WelcomeScreen from './WelcomeScreen';
import ChatMessages from './ChatMessages';
import ChatInput from './ChatInput';
import { ToastContainer, useToast } from '@/shared/ui/components/Toast';
import { config } from '@/shared/utils/config/config';
import { useRateLimit } from '../hooks/use-rate-limit';

export const maxDuration = 30;

export default function ChatBoxIframe() {
  const [conversation, setConversation] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false);
  const [regeneratingMessageId, setRegeneratingMessageId] = useState<string | null>(null);
  const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(null);
  const { toasts, removeToast, success, error } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationRef = useRef<Message[]>([]);
  
  const defaultSettings = {
    temperature: 0.3,
    model: 'mistral' as const,
    maxTokens: 1000,
    maxResults: 7,
  };
  
  const { 
    status: rateLimitStatus, 
    loading: rateLimitLoading, 
    canSendMessage, 
    checkRateLimit, 
    formatTimeRemaining,
    forceRateLimitStatus
  } = useRateLimit();

  useEffect(() => {
    const savedHistory = loadChatHistory();
    if (savedHistory.length > 0) {
      setConversation(savedHistory);
    }
    setHasLoadedHistory(true);
  }, []);

  useEffect(() => {
    conversationRef.current = conversation;
  }, [conversation]);

  useEffect(() => {
    if (hasLoadedHistory && conversation.length > 0) {
      saveChatHistory(conversation);
    }
  }, [conversation, hasLoadedHistory]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdownIndex !== null) {
        setOpenDropdownIndex(null);
      }
    };

    if (openDropdownIndex !== null) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openDropdownIndex]);

  const sendMessage = useCallback(async (messageContent: string) => {
    if (!messageContent.trim()) return;
    
    if (!canSendMessage) {
      if (rateLimitStatus?.isBlocked) {
        const timeRemaining = formatTimeRemaining(rateLimitStatus.timeUntilUnblock);
        error(`You are temporarily blocked. Please wait ${timeRemaining} before trying again.`);
      } else {
        const timeRemaining = formatTimeRemaining(rateLimitStatus?.timeUntilReset || 0);
        error(`Rate limit exceeded. Please wait ${timeRemaining} before trying again.`);
      }
      return;
    }
    
    const userMessage: Message = {
      role: 'user',
      content: messageContent,
      timestamp: new Date()
    };
    
    setConversation(prev => [...prev, userMessage]);
    setInput('');
    setIsStreaming(true);
    
    try {
      const modelName =
        defaultSettings.model === 'mistral'
          ? config.getModels().mistral.chat
          : config.getModels().groq.chat;
      const { messages, newMessage } = await continueConversation([
        ...conversationRef.current,
        userMessage,
      ], {
        model: modelName,
        temperature: defaultSettings.temperature,
        maxTokens: defaultSettings.maxTokens,
        maxResults: defaultSettings.maxResults,
        customPrompt: defaultSettings.customPrompt
      });

      let textContent = '';

      for await (const delta of readStreamableValue(newMessage)) {
        textContent = `${textContent}${delta}`;

        if (textContent.includes('Rate limit exceeded') || 
            textContent.includes('You are blocked for') || 
            textContent.includes('Too many invalid messages')) {
          
          if (textContent.includes('Rate limit exceeded')) {
            const secondsMatch = textContent.match(/wait (\d+) seconds? before/);
            const seconds = secondsMatch ? parseInt(secondsMatch[1]) : 60;
            forceRateLimitStatus(true, false, seconds);
          } else if (textContent.includes('You are blocked for') || textContent.includes('Too many invalid messages')) {
            const minutesMatch = textContent.match(/blocked for (\d+) minutes?/);
            const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 10;
            forceRateLimitStatus(false, true, undefined, minutes);
          }
        }

        setConversation([
          ...messages,
          { 
            role: 'assistant', 
            content: textContent,
            timestamp: new Date()
          },
        ]);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      
      if (err instanceof Error) {
        if (err.message.includes('Rate limit exceeded') || 
            err.message.includes('blocked') || 
            err.message.includes('Too many invalid messages')) {
          checkRateLimit();
          error('Rate limit exceeded. Please wait before trying again.');
        } else {
          error('An error occurred while sending your message. Please try again.');
        }
      } else {
        error('An unexpected error occurred. Please try again.');
      }
      
      setConversation(prev => [
        ...prev,
        { 
          role: 'assistant', 
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date()
        },
      ]);
    } finally {
      setIsStreaming(false);
    }
  }, [canSendMessage, rateLimitStatus, checkRateLimit, formatTimeRemaining, forceRateLimitStatus, error]);

  const regenerateResponse = useCallback(async (messageIndex: number, strategy: 'quick' | 'detailed' | 'concise' = 'quick') => {
    if (messageIndex < 0 || messageIndex >= conversation.length) return;
    
    const targetMessage = conversation[messageIndex];
    if (targetMessage.role !== 'assistant') return;

    const userMessageIndex = messageIndex - 1;
    if (userMessageIndex < 0 || conversation[userMessageIndex].role !== 'user') return;

    const conversationUpToUser = conversation.slice(0, messageIndex); // up to the user message
    const userMessage = conversation[userMessageIndex];
    const systemRegenerate: Message = {
      role: 'system',
      content: 'Regenerate the previous answer. Rewrite it in a different way.',
    };
    const messageId = `msg-${messageIndex}`;
    
    setRegeneratingMessageId(messageId);
    setIsStreaming(true);

    try {
      const modelName =
        defaultSettings.model === 'mistral'
          ? config.getModels().mistral.chat
          : config.getModels().groq.chat;
      const regenerationOptions = {
        model: modelName,
        temperature: defaultSettings.temperature,
        maxTokens: defaultSettings.maxTokens,
        maxResults: defaultSettings.maxResults,
        customPrompt: defaultSettings.customPrompt,
        promptType: strategy === 'detailed' ? 'detailed' :
                   strategy === 'concise' ? 'concise' : undefined
      };

      const { messages, newMessage } = await continueConversation([
        ...conversationUpToUser,
        userMessage,
        systemRegenerate,
      ], regenerationOptions);

      let textContent = '';

      for await (const delta of readStreamableValue(newMessage)) {
        textContent = `${textContent}${delta}`;

        setConversation(prev => [
          ...prev.slice(0, messageIndex),
          {
            role: 'assistant',
            content: textContent,
            timestamp: new Date(),
            regenerated: true
          },
        ]);
      }
    } catch (err) {
      console.error('Error regenerating response:', err);
      error('An error occurred while regenerating the response. Please try again.');
      setConversation(prev => [
        ...prev,
        { 
          role: 'assistant', 
          content: 'Sorry, I encountered an error while regenerating the response.',
          timestamp: new Date()
        },
      ]);
    } finally {
      setIsStreaming(false);
      setRegeneratingMessageId(null);
    }
  }, [conversation, error]);

  useEffect(() => {
    scrollToBottom();
  }, [conversation]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (input.trim() && !isStreaming && canSendMessage) {
        sendMessage(input);
      }
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
  };

  const handleSuggestedQuestion = (question: string) => {
    setInput(question);
  };

  const handleVoiceTranscript = (transcript: string) => {
    setInput(transcript);
  };

  return (
    <div className="flex flex-col h-full w-full bg-white/95 backdrop-blur-sm overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {conversation.length === 0 ? (
          <WelcomeScreen onQuestionClick={handleSuggestedQuestion} />
        ) : (
          <ChatMessages
            conversation={conversation}
            isStreaming={isStreaming}
            regeneratingMessageId={regeneratingMessageId}
            openDropdownIndex={openDropdownIndex}
            onRegenerate={regenerateResponse}
            onDropdownToggle={setOpenDropdownIndex}
          />
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <ChatInput
        input={input}
        isStreaming={isStreaming}
        rateLimitStatus={rateLimitStatus}
        rateLimitLoading={rateLimitLoading}
        canSendMessage={canSendMessage}
        formatTimeRemaining={formatTimeRemaining}
        onInputChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onSendMessage={() => sendMessage(input)}
        onVoiceTranscript={handleVoiceTranscript}
      />

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
} 