import React from 'react';
import { Message } from '@/app/actions';
import MarkdownRenderer from '../MarkdownRenderer';
import MessageRegeneration from './MessageRegeneration';

interface ChatMessagesProps {
  conversation: Message[];
  isStreaming: boolean;
  regeneratingMessageId: string | null;
  openDropdownIndex: number | null;
  onRegenerate: (index: number, strategy: 'quick' | 'detailed' | 'concise') => void;
  onDropdownToggle: (index: number) => void;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatMessages({
  conversation,
  isStreaming,
  regeneratingMessageId,
  openDropdownIndex,
  onRegenerate,
  onDropdownToggle
}: ChatMessagesProps) {
  return (
    <div className="space-y-6">
      {conversation.map((message, index) => (
        <div
          key={index}
          className={`flex ${
            message.role === 'user' ? 'justify-end' : 'justify-start'
          }`}
        >
          <div className={`flex flex-col max-w-xs lg:max-w-md xl:max-w-lg ${
            message.role === 'user' ? 'items-end' : 'items-start'
          }`}>
            {/* Avatar for assistant messages */}
            {message.role === 'assistant' && (
              <div className="w-8 h-8 bg-gradient-to-br from-conab-action to-conab-action-lighten rounded-full flex items-center justify-center mb-2 shadow-lg">
                <span className="text-white text-xs font-bold">AI</span>
              </div>
            )}
            
            {/* Message bubble */}
            <div
              className={`relative px-6 py-4 rounded-2xl shadow-lg ${
                message.role === 'user'
                  ? 'bg-gradient-to-br from-conab-action to-conab-action-lighten text-white rounded-br-md'
                  : 'bg-white/90 backdrop-blur-sm text-gray-800 border border-white/50 rounded-bl-md'
              }`}
            >
              {message.role === 'user' ? (
                <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>
              ) : (
                <div className="relative">
                  <MarkdownRenderer content={message.content} />
                  {isStreaming && message === conversation[conversation.length - 1] && (
                    <div className="inline-flex space-x-1 ml-3 mt-2">
                      <div className="w-2 h-2 bg-conab-action rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-conab-action rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-conab-action rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Message metadata */}
            <div className={`flex items-center space-x-2 mt-2 ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}>
              {message.role === 'assistant' && (
                <MessageRegeneration
                  messageIndex={index}
                  isStreaming={isStreaming}
                  regeneratingMessageId={regeneratingMessageId}
                  openDropdownIndex={openDropdownIndex}
                  onRegenerate={onRegenerate}
                  onDropdownToggle={onDropdownToggle}
                />
              )}
              
              {message.regenerated && (
                <span className="text-xs text-conab-action/70 italic bg-conab-action/10 px-2 py-1 rounded-full">
                  Regenerated
                </span>
              )}
              
              {message.timestamp && (
                <span className={`text-xs ${
                  message.role === 'user' ? 'text-conab-action/70' : 'text-gray-500'
                }`}>
                  {formatTime(message.timestamp)}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
} 