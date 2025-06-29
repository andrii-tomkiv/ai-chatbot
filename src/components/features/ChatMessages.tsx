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
              <span className="text-xs text-conab-action/70 italic">(regenerated)</span>
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
  );
} 