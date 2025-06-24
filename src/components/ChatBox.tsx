'use client';

import { useState, useEffect } from 'react';
import { Message, continueConversation, ChatOptions } from '@/app/actions';
import { readStreamableValue } from 'ai/rsc';

export const maxDuration = 30;

// Function to parse URL parameters
function getUrlParams(): ChatOptions {
  if (typeof window === 'undefined') return {};
  
  const urlParams = new URLSearchParams(window.location.search);
  return {
    promptType: urlParams.get('prompt') || undefined,
    maxResults: urlParams.get('maxResults') ? parseInt(urlParams.get('maxResults')!) : undefined,
    model: urlParams.get('model') || undefined,
  };
}

export default function ChatBox() {
  const [conversation, setConversation] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [chatOptions, setChatOptions] = useState<ChatOptions>({});

  // Read URL parameters on component mount
  useEffect(() => {
    setChatOptions(getUrlParams());
  }, []);

  const sendMessage = async (messageContent: string) => {
    if (!messageContent.trim()) return;
    
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

    setInput('');
  };

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto bg-white rounded-lg shadow-lg border border-gray-200">
      <div className="p-4 border-b bg-blue-600 rounded-t-lg">
        <h2 className="text-lg font-semibold text-white">AI Assistant</h2>
        <p className="text-sm text-white/80">
          {chatOptions.promptType ? `Mode: ${chatOptions.promptType}` : 'Ask me anything about our content'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {conversation.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>Start a conversation by asking a question!</p>
            {chatOptions.promptType && (
              <p className="text-xs mt-2 text-gray-400">
                Using {chatOptions.promptType} mode
              </p>
            )}
          </div>
        ) : (
          conversation.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-gray-200 bg-white rounded-b-lg">
        <div className="flex space-x-2">
          <textarea
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              const textarea = event.target;
              textarea.style.height = 'auto';
              textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                
                // Reset textarea height immediately
                const textarea = event.target as HTMLTextAreaElement;
                textarea.style.height = '40px';
                
                sendMessage(input);
              }
            }}
            placeholder="Type your message... (Shift+Enter for new line)"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white resize-none"
            rows={1}
            style={{ minHeight: '40px', maxHeight: '120px' }}
          />
          <button
            onClick={() => sendMessage(input)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors font-medium"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
} 