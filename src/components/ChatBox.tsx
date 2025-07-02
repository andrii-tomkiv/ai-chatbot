'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Message, continueConversation } from '@/app/actions';
import { readStreamableValue } from 'ai/rsc';
import { saveChatHistory, loadChatHistory, clearChatHistory } from './features/ChatHistory';
import ChatHeader from './features/ChatHeader';
import WelcomeScreen from './features/WelcomeScreen';
import ChatMessages from './features/ChatMessages';
import ChatInput from './features/ChatInput';
import ChatSettings, { ChatSettings as ChatSettingsType } from './features/ChatSettings';
import { config } from '@/lib/config';

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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [chatSettings, setChatSettings] = useState<ChatSettingsType>({
    temperature: 0.7,
    model: 'mistral',
    maxTokens: 1000
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationRef = useRef<Message[]>([]);

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('chatSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setChatSettings(parsed);
      } catch (error) {
        console.error('Error loading chat settings:', error);
      }
    }
  }, []);

  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('chatSettings', JSON.stringify(chatSettings));
  }, [chatSettings]);

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
      const modelName =
        chatSettings.model === 'mistral'
          ? config.getModels().mistral.chat
          : config.getModels().groq.chat;
      const { messages, newMessage } = await continueConversation([
        ...conversationRef.current,
        userMessage,
      ], {
        model: modelName,
        maxResults: config.getVectorDbConfig().maxResults,
        temperature: chatSettings.temperature,
        maxTokens: chatSettings.maxTokens
      });

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
            timestamp: new Date()
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
  }, [chatSettings.model, chatSettings.temperature, chatSettings.maxTokens]);

  const regenerateResponse = useCallback(async (messageIndex: number, strategy: 'quick' | 'detailed' | 'concise' = 'quick') => {
    if (messageIndex < 0 || messageIndex >= conversation.length) return;
    
    const targetMessage = conversation[messageIndex];
    if (targetMessage.role !== 'assistant') return;

    const userMessageIndex = messageIndex - 1;
    if (userMessageIndex < 0 || conversation[userMessageIndex].role !== 'user') return;

    // For regeneration: send up to user message, then user message, then system instruction
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
        chatSettings.model === 'mistral'
          ? config.getModels().mistral.chat
          : config.getModels().groq.chat;
      const regenerationOptions = {
        maxResults: config.getVectorDbConfig().maxResults,
        model: modelName,
        temperature: chatSettings.temperature,
        maxTokens: chatSettings.maxTokens,
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
          ...prev.slice(0, messageIndex), // up to the user message (inclusive)
          {
            role: 'assistant',
            content: textContent,
            timestamp: new Date(),
            regenerated: true
          },
        ]);
      }
    } catch (error) {
      console.error('Error regenerating response:', error);
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
  }, [conversation, chatSettings.model, chatSettings.temperature, chatSettings.maxTokens]);

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
      if (input.trim() && !isStreaming) {
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

  const handleSettingsChange = (newSettings: ChatSettingsType) => {
    setChatSettings(newSettings);
    setNotification({
      message: `Settings updated: ${newSettings.model} model, temperature ${newSettings.temperature}`,
      type: 'success'
    });
  };

  const toggleSettings = () => {
    setIsSettingsOpen(!isSettingsOpen);
  };

  return (
    <div className="flex flex-col h-full w-full max-w-4xl bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
      {notification && (
        <div className={`p-4 text-sm font-medium backdrop-blur-sm ${
          notification.type === 'success' 
            ? 'bg-green-100/80 text-green-800 border-b border-green-200/50' 
            : 'bg-red-100/80 text-red-800 border-b border-red-200/50'
        }`}>
          {notification.message}
        </div>
      )}
      
      <ChatHeader 
        onClearConversation={clearConversation}
        currentModel={chatSettings.model}
        currentTemperature={chatSettings.temperature}
        settingsComponent={
          <ChatSettings
            settings={chatSettings}
            onSettingsChange={handleSettingsChange}
            isOpen={isSettingsOpen}
            onToggle={toggleSettings}
          />
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-transparent to-conab-light-background/20">
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