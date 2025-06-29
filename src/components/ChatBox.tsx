'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Message, continueConversation } from '@/app/actions';
import { readStreamableValue } from 'ai/rsc';
import { saveChatHistory, loadChatHistory, clearChatHistory } from './features/ChatHistory';
import ChatHeader from './features/ChatHeader';
import WelcomeScreen from './features/WelcomeScreen';
import ChatMessages from './features/ChatMessages';
import ChatInput from './features/ChatInput';

export const maxDuration = 30;

export default function ChatBox() {
  const [conversation, setConversation] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState<{ remaining: number; resetTime: number } | null>(null);
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [regeneratingMessageId, setRegeneratingMessageId] = useState<string | null>(null);
  const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockMessage, setBlockMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationRef = useRef<Message[]>([]);

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
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Auto-clear blocked state when rate limit resets
  useEffect(() => {
    if (rateLimitInfo && rateLimitInfo.remaining === 0) {
      const timeUntilReset = rateLimitInfo.resetTime - Date.now();
      if (timeUntilReset > 0) {
        const timer = setTimeout(() => {
          setRateLimitInfo(null);
          setIsBlocked(false);
          setBlockMessage(null);
        }, timeUntilReset);
        return () => clearTimeout(timer);
      }
    }
  }, [rateLimitInfo]);

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
    
    const userMessage: Message = {
      role: 'user',
      content: messageContent,
      timestamp: new Date()
    };
    
    setConversation(prev => [...prev, userMessage]);
    setInput('');
    setIsStreaming(true);
    
    try {
      const { messages, newMessage, sources } = await continueConversation([
        ...conversationRef.current,
        userMessage,
      ]);

      let textContent = '';

      for await (const delta of readStreamableValue(newMessage)) {
        textContent = `${textContent}${delta}`;

        if (textContent.includes('Rate limit exceeded')) {
          setRateLimitInfo({
            remaining: 0,
            resetTime: Date.now() + 60000
          });
        }

        // Check for blocked messages
        if (textContent.includes('You are blocked for') || textContent.includes('Too many invalid messages')) {
          setIsBlocked(true);
          setBlockMessage(textContent);
          // Extract block duration if available
          const blockMatch = textContent.match(/blocked for (\d+) minutes/);
          if (blockMatch) {
            const blockMinutes = parseInt(blockMatch[1]);
            setTimeout(() => {
              setIsBlocked(false);
              setBlockMessage(null);
            }, blockMinutes * 60 * 1000);
          }
        }

        setConversation([
          ...messages,
          { 
            role: 'assistant', 
            content: textContent,
            timestamp: new Date(),
            sources: sources
          },
        ]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Check if it's a rate limit or block error
      if (error instanceof Error) {
        if (error.message.includes('Rate limit exceeded')) {
          setRateLimitInfo({
            remaining: 0,
            resetTime: Date.now() + 60000
          });
        } else if (error.message.includes('blocked') || error.message.includes('Too many invalid messages')) {
          setIsBlocked(true);
          setBlockMessage(error.message);
        }
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
  }, []);

  const regenerateResponse = useCallback(async (messageIndex: number, strategy: 'quick' | 'detailed' | 'concise' = 'quick') => {
    if (messageIndex < 0 || messageIndex >= conversation.length) return;
    
    const targetMessage = conversation[messageIndex];
    if (targetMessage.role !== 'assistant') return;

    const userMessageIndex = messageIndex - 1;
    if (userMessageIndex < 0 || conversation[userMessageIndex].role !== 'user') return;

    const userMessage = conversation[userMessageIndex];
    const messageId = `msg-${messageIndex}`;
    
    setRegeneratingMessageId(messageId);
    setIsStreaming(true);

    try {
      const regenerationOptions = {
        maxResults: 5,
        promptType: strategy === 'detailed' ? 'educational' : 
                   strategy === 'concise' ? 'customerService' : undefined
      };

      const conversationUpToUser = conversation.slice(0, messageIndex);
      
      const { messages, newMessage, sources } = await continueConversation([
        ...conversationUpToUser,
        userMessage,
      ], regenerationOptions);

      let textContent = '';

      for await (const delta of readStreamableValue(newMessage)) {
        textContent = `${textContent}${delta}`;

        if (textContent.includes('Rate limit exceeded')) {
          setRateLimitInfo({
            remaining: 0,
            resetTime: Date.now() + 60000
          });
        }

        setConversation(prev => {
          const newConversation = [...prev];
          newConversation[messageIndex] = {
            ...newConversation[messageIndex],
            content: textContent,
            timestamp: new Date(),
            sources: sources,
            regenerated: true
          };
          return newConversation;
        });
      }
    } catch (error) {
      console.error('Error regenerating response:', error);
      
      let errorMessage = 'Sorry, I encountered an error while regenerating. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('Groq API') || error.message.includes('GROQ_API_KEY')) {
          errorMessage = 'Groq API not configured. Please contact support to enable different sources feature.';
        } else if (error.message.includes('Rate limit')) {
          errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
        } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          errorMessage = 'API authentication failed. Please contact support.';
        } else if (error.message.includes('500') || error.message.includes('Internal server error')) {
          errorMessage = 'Server error. Please try again in a moment.';
        }
      }
      
      setConversation(prev => {
        const newConversation = [...prev];
        newConversation[messageIndex] = {
          ...newConversation[messageIndex],
          content: errorMessage,
          timestamp: new Date(),
          regenerated: true
        };
        return newConversation;
      });
    } finally {
      setIsStreaming(false);
      setRegeneratingMessageId(null);
    }
  }, [conversation]);

  useEffect(() => {
    scrollToBottom();
  }, [conversation]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const clearConversation = () => {
    setConversation([]);
    clearChatHistory();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage(input);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
    const textarea = event.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  };

  const handleSuggestedQuestion = (question: string) => {
    sendMessage(question);
  };

  const handleVoiceTranscript = (transcript: string) => {
    setInput(transcript);
  };

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto bg-conab-light-background rounded-lg shadow-lg border border-conab-middle-blue">
      {notification && (
        <div className={`p-3 text-sm font-medium ${
          notification.type === 'success' 
            ? 'bg-green-100 text-green-800 border-b border-green-200' 
            : 'bg-red-100 text-red-800 border-b border-red-200'
        }`}>
          {notification.message}
        </div>
      )}
      
      <ChatHeader onClearConversation={clearConversation} />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
        rateLimitInfo={rateLimitInfo}
        isBlocked={isBlocked}
        blockMessage={blockMessage}
        onInputChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onSendMessage={() => sendMessage(input)}
        onVoiceTranscript={handleVoiceTranscript}
      />
    </div>
  );
} 