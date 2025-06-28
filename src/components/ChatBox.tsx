'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Message, continueConversation, ChatOptions } from '@/app/actions';
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

function getUrlParams(): ChatOptions {
  if (typeof window === 'undefined') return {};
  
  const urlParams = new URLSearchParams(window.location.search);
  const options = {
    promptType: urlParams.get('prompt') || undefined,
    maxResults: urlParams.get('maxResults') ? parseInt(urlParams.get('maxResults')!) : undefined,
    model: urlParams.get('model') || undefined,
    action: urlParams.get('action') || undefined,
  };
  
  return options;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatBox() {
  const [conversation, setConversation] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [chatOptions, setChatOptions] = useState<ChatOptions>({});
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const conversationRef = useRef<Message[]>([]);
  const chatOptionsRef = useRef<ChatOptions>({});

  useEffect(() => {
    conversationRef.current = conversation;
  }, [conversation]);

  useEffect(() => {
    chatOptionsRef.current = chatOptions;
  }, [chatOptions]);

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
      ], chatOptionsRef.current);

      let textContent = '';

      for await (const delta of readStreamableValue(newMessage)) {
        textContent = `${textContent}${delta}`;

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

  useEffect(() => {
    const options = getUrlParams();
    setChatOptions(options);
    
    if (options.action) {
      const actionQuestions = {
        'surrogacy': 'What are the requirements to become a surrogate?',
        'egg-donation': 'How does the egg donation process work?',
        'intended-parents': 'What services do you offer for intended parents?'
      };
      
      const question = actionQuestions[options.action as keyof typeof actionQuestions];
      if (question) {
        const url = new URL(window.location.href);
        url.searchParams.delete('action');
        window.history.pushState({}, '', url.toString());
        
        setTimeout(() => {
          sendMessage(question);
        }, 500);
      }
    }
  }, [sendMessage]);

  useEffect(() => {
    scrollToBottom();
  }, [conversation]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const clearConversation = () => {
    setConversation([]);
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
      <div className="p-4 border-b bg-conab-header rounded-t-lg">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h2 className="text-lg font-semibold text-white">AI Assistant</h2>
            <p className="text-sm text-white/80">
              {chatOptions.promptType ? `Mode: ${chatOptions.promptType}` : 'Ask me anything about our content'}
            </p>
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
            
            <div className="text-xs text-conab-dark-blue/70 mt-4">
              {chatOptions.promptType && (
                <p>Using {chatOptions.promptType} mode</p>
              )}
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