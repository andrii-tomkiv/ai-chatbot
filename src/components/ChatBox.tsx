'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Message, continueConversation } from '@/app/actions';
import { readStreamableValue } from 'ai/rsc';
import VoiceInput from './VoiceInput';
import MarkdownRenderer from './MarkdownRenderer';

export const maxDuration = 30;

const SUGGESTED_QUESTIONS = [
  "What are the requirements to become a surrogate?",
  "How does the egg donation process work?",
  "What services do you offer for intended parents?",
  "What is the surrogacy timeline?",
  "How much does surrogacy cost?",
  "What support do you provide during the process?"
];

const CHAT_HISTORY_KEY = 'conab_chat_history';
const CHAT_TIMESTAMP_KEY = 'conab_chat_timestamp';
const MAX_HISTORY_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const MAX_HISTORY_LENGTH = 50; // Maximum number of messages to store

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function saveChatHistory(conversation: Message[]): void {
  try {
    const historyData = {
      messages: conversation,
      timestamp: Date.now()
    };
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(historyData));
  } catch (error) {
    console.error('Failed to save chat history:', error);
  }
}

function loadChatHistory(): Message[] {
  try {
    const savedHistory = localStorage.getItem(CHAT_HISTORY_KEY);
    if (!savedHistory) return [];

    const historyData = JSON.parse(savedHistory);
    
    if (Date.now() - historyData.timestamp > MAX_HISTORY_AGE) {
      localStorage.removeItem(CHAT_HISTORY_KEY);
      return [];
    }

    const messages = historyData.messages.map((msg: any) => ({
      ...msg,
      timestamp: msg.timestamp ? new Date(msg.timestamp) : undefined
    }));

    return messages.slice(-MAX_HISTORY_LENGTH);
  } catch (error) {
    console.error('Failed to load chat history:', error);
    return [];
  }
}

function clearChatHistory(): void {
  try {
    localStorage.removeItem(CHAT_HISTORY_KEY);
    localStorage.removeItem(CHAT_TIMESTAMP_KEY);
  } catch (error) {
    console.error('Failed to clear chat history:', error);
  }
}

export default function ChatBox() {
  const [conversation, setConversation] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState<{ remaining: number; resetTime: number } | null>(null);
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [regeneratingMessageId, setRegeneratingMessageId] = useState<string | null>(null);
  const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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

  // Close dropdown when clicking outside
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
            resetTime: Date.now() + 60000 // 1 minute from now
          });
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

  const regenerateResponse = useCallback(async (messageIndex: number, strategy: 'quick' | 'detailed' | 'concise' | 'different-sources' = 'quick') => {
    if (messageIndex < 0 || messageIndex >= conversation.length) return;
    
    const targetMessage = conversation[messageIndex];
    if (targetMessage.role !== 'assistant') return;

    // Find the user message that prompted this response
    const userMessageIndex = messageIndex - 1;
    if (userMessageIndex < 0 || conversation[userMessageIndex].role !== 'user') return;

    const userMessage = conversation[userMessageIndex];
    const messageId = `msg-${messageIndex}`;
    
    setRegeneratingMessageId(messageId);
    setIsStreaming(true);

    try {
      // Create regeneration options based on strategy
      const regenerationOptions = {
        maxResults: 5,
        promptType: strategy === 'detailed' ? 'educational' : 
                   strategy === 'concise' ? 'customerService' : undefined
      };

      // Instead of removing the message, we'll create a new one with the regenerated content
      // Keep the conversation up to the user message, then add a new assistant response
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
            resetTime: Date.now() + 60000 // 1 minute from now
          });
        }

        // Update the conversation by replacing the assistant message at the specific index
        setConversation(prev => {
          const newConversation = [...prev];
          newConversation[messageIndex] = {
            ...newConversation[messageIndex],
            content: textContent,
            timestamp: new Date(),
            sources: sources,
            regenerated: true // Mark as regenerated
          };
          return newConversation;
        });
      }
    } catch (error) {
      console.error('Error regenerating response:', error);
      
      // Show specific error message for different error types
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
      
      <div className="p-4 border-b bg-conab-header rounded-t-lg">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h2 className="text-lg font-semibold text-white">AI Assistant</h2>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={clearConversation}
              className="px-3 py-1 text-xs bg-white/20 text-white rounded hover:bg-white/30 transition-colors"
              title="Clear conversation"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {conversation.length === 0 ? (
          <div className="text-center text-conab-dark-blue py-8">
            <div className="mb-4">
              <svg className="w-12 h-12 mx-auto text-conab-action" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-lg font-medium mb-2">Welcome to ConceiveAbilities AI Assistant</p>
            <p className="text-sm mb-6">I&apos;m here to help you with information about surrogacy, egg donation, and our services.</p>
            
            <div className="space-y-2">
              <p className="text-sm font-medium text-conab-dark-blue mb-3">Try asking:</p>
              <div className="grid grid-cols-1 gap-2">
                {SUGGESTED_QUESTIONS.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestedQuestion(question)}
                    className="text-left p-3 bg-white border border-conab-middle-blue rounded-lg hover:bg-conab-action hover:text-white hover:border-conab-action transition-colors text-sm"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {conversation.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div className="flex flex-col max-w-xs lg:max-w-md">
                  <div
                    className={`px-4 py-2 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-conab-action text-white'
                        : 'bg-white text-conab-dark-blue border border-conab-middle-blue'
                    }`}
                  >
                    {message.role === 'user' ? (
                      <div className="whitespace-pre-wrap">{message.content}</div>
                    ) : (
                      <div className="relative">
                        <MarkdownRenderer content={message.content} />
                        {isStreaming && message === conversation[conversation.length - 1] && (
                          <div className="inline-flex space-x-1 ml-2">
                            <div className="w-1.5 h-1.5 bg-conab-action rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-1.5 h-1.5 bg-conab-action rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-1.5 h-1.5 bg-conab-action rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {message.role === 'assistant' && message.sources && message.sources.length > 0 && (
                    <div className="mt-2 text-xs text-conab-dark-blue/70">
                      <div className="font-medium mb-1">Sources:</div>
                      <div className="space-y-1">
                        {message.sources.map((source, sourceIndex) => (
                          <a
                            key={sourceIndex}
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-conab-action hover:underline truncate"
                            title={source.title || source.url}
                          >
                            {source.title || source.url}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {message.role === 'assistant' && (
                    <div className="mt-2 flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <button
                          onClick={() => regenerateResponse(index, 'quick')}
                          disabled={isStreaming || regeneratingMessageId === `msg-${index}`}
                          className="px-2 py-1 text-xs bg-conab-action text-white rounded hover:bg-conab-action-lighten disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title="Regenerate with same approach"
                        >
                          {regeneratingMessageId === `msg-${index}` ? (
                            <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            '🔄'
                          )}
                        </button>
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenDropdownIndex(openDropdownIndex === index ? null : index);
                            }}
                            disabled={isStreaming}
                            className="px-2 py-1 text-xs bg-conab-middle-blue text-white rounded hover:bg-conab-dark-blue disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            title="More regeneration options"
                          >
                            ⋯
                          </button>
                          {openDropdownIndex === index && (
                            <div className="absolute bottom-full left-0 mb-1 bg-white border border-conab-middle-blue rounded-lg shadow-lg z-20 min-w-40">
                              <div className="p-1 space-y-1">
                                <button
                                  onClick={() => {
                                    regenerateResponse(index, 'detailed');
                                    setOpenDropdownIndex(null);
                                  }}
                                  disabled={isStreaming}
                                  className="w-full text-left px-2 py-1 text-xs text-conab-dark-blue hover:bg-conab-light-background rounded transition-colors"
                                >
                                  📝 More detailed
                                </button>
                                <button
                                  onClick={() => {
                                    regenerateResponse(index, 'concise');
                                    setOpenDropdownIndex(null);
                                  }}
                                  disabled={isStreaming}
                                  className="w-full text-left px-2 py-1 text-xs text-conab-dark-blue hover:bg-conab-light-background rounded transition-colors"
                                >
                                  ✂️ More concise
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      {message.regenerated && (
                        <span className="text-xs text-conab-action/70 italic">(regenerated)</span>
                      )}
                    </div>
                  )}
                  
                  {message.timestamp && (
                    <span className={`text-xs mt-1 ${
                      message.role === 'user' ? 'text-right text-conab-action/70' : 'text-left text-conab-dark-blue/50'
                    }`}>
                      {formatTime(message.timestamp)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-conab-middle-blue bg-conab-light-background rounded-b-lg">
        {rateLimitInfo && rateLimitInfo.remaining <= 2 && (
          <div className="mb-3 p-2 bg-yellow-100 border border-yellow-300 rounded text-yellow-800 text-xs">
            ⚠️ Rate limit warning: {rateLimitInfo.remaining} requests remaining. 
            Reset in {Math.ceil((rateLimitInfo.resetTime - Date.now()) / 1000)}s
          </div>
        )}
        <div className="flex space-x-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type your message... (Shift+Enter for new line)"
            className="flex-1 px-3 py-2 border border-conab-middle-blue rounded-lg focus:outline-none focus:ring-2 focus:ring-conab-action focus:border-conab-action text-conab-dark-blue bg-white resize-none"
            rows={1}
            style={{ minHeight: '40px', maxHeight: '120px' }}
            disabled={isStreaming}
          />
          <VoiceInput onTranscript={handleVoiceTranscript} disabled={isStreaming} />
          <button
            onClick={() => sendMessage(input)}
            disabled={isStreaming || !input.trim()}
            className="px-4 py-2 bg-conab-action text-white rounded-lg hover:bg-conab-action-lighten focus:outline-none focus:ring-2 focus:ring-conab-action transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isStreaming ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              'Send'
            )}
          </button>
        </div>
      </div>
    </div>
  );
} 