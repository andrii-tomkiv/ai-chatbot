'use client';

import { useState, useEffect } from 'react';
import { Message, continueConversation, ChatOptions } from '@/app/actions';
import { readStreamableValue } from 'ai/rsc';

export const maxDuration = 30;

function getUrlParams(): ChatOptions {
  if (typeof window === 'undefined') return {};
  
  const urlParams = new URLSearchParams(window.location.search);
  const options = {
    promptType: urlParams.get('prompt') || undefined,
    maxResults: urlParams.get('maxResults') ? parseInt(urlParams.get('maxResults')!) : undefined,
    model: urlParams.get('model') || undefined,
  };
  
  console.log('URL parameters read:', {
    url: window.location.search,
    options
  });
  
  return options;
}

export default function ChatBox() {
  const [conversation, setConversation] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [chatOptions, setChatOptions] = useState<ChatOptions>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const options = getUrlParams();
    setChatOptions(options);
  }, []);

  const sendMessage = async (messageContent: string) => {
    if (!messageContent.trim() || isLoading) return;
    
    setIsLoading(true);
    
    try {
      const { messages, newMessage } = await continueConversation([
        ...conversation,
        { role: 'user', content: messageContent },
      ], chatOptions);

      let textContent = '';

      for await (const delta of readStreamableValue(newMessage)) {
        textContent = `${textContent}${delta}`;

        setConversation([
          ...messages,
          { role: 'assistant', content: textContent },
        ]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Add error message to conversation
      setConversation(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' },
      ]);
    } finally {
      setIsLoading(false);
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto bg-conab-light-background rounded-lg shadow-lg border border-conab-middle-blue">
      <div className="p-4 border-b bg-conab-header rounded-t-lg">
        <h2 className="text-lg font-semibold text-white">AI Assistant</h2>
        <p className="text-sm text-white/80">
          {chatOptions.promptType ? `Mode: ${chatOptions.promptType}` : 'Ask me anything about our content'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {conversation.length === 0 ? (
          <div className="text-center text-conab-dark-blue py-8">
            <p>Start a conversation by asking a question!</p>
            {chatOptions.promptType && (
              <p className="text-xs mt-2 text-conab-dark-blue">
                Using {chatOptions.promptType} mode
              </p>
            )}
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
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-conab-action text-white'
                      : 'bg-white text-conab-dark-blue border border-conab-middle-blue'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                </div>
              </div>
            ))}
            
            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white text-conab-dark-blue border border-conab-middle-blue max-w-xs lg:max-w-md px-4 py-2 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-conab-action rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-conab-action rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-conab-action rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-sm text-conab-middle-blue">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="p-4 border-t border-conab-middle-blue bg-conab-light-background rounded-b-lg">
        <div className="flex space-x-2">
          <textarea
            value={input}
            onChange={(event) => {
              if (!isLoading) {
                setInput(event.target.value);
                const textarea = event.target;
                textarea.style.height = 'auto';
                textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
              }
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !isLoading) {
                event.preventDefault();
                
                const textarea = event.target as HTMLTextAreaElement;
                textarea.style.height = '40px';
                
                sendMessage(input);
              }
            }}
            placeholder={isLoading ? "Please wait..." : "Type your message... (Shift+Enter for new line)"}
            className={`flex-1 px-3 py-2 border border-conab-middle-blue rounded-lg focus:outline-none focus:ring-2 focus:ring-conab-action focus:border-conab-action text-conab-dark-blue bg-white resize-none ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            rows={1}
            style={{ minHeight: '40px', maxHeight: '120px' }}
            disabled={isLoading}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={isLoading || !input.trim()}
            className={`px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-conab-action transition-colors font-medium ${
              isLoading || !input.trim()
                ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                : 'bg-conab-action text-white hover:bg-conab-action-lighten'
            }`}
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Sending</span>
              </div>
            ) : (
              'Send'
            )}
          </button>
        </div>
      </div>
    </div>
  );
} 