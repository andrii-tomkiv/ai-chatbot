'use client';

import React, { useRef } from 'react';
import { VoiceInput } from '@/shared/ui/components';
import { RateLimitStatus } from "../hooks/use-rate-limit";

interface ChatInputProps {
  input: string;
  isStreaming: boolean;
  rateLimitStatus: RateLimitStatus | null;
  rateLimitLoading: boolean;
  canSendMessage: boolean | undefined;
  formatTimeRemaining: (milliseconds: number) => string;
  onInputChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSendMessage: () => void;
  onVoiceTranscript: (transcript: string) => void;
}

export default function ChatInput({
  input,
  isStreaming,
  rateLimitStatus,
  rateLimitLoading,
  canSendMessage,
  formatTimeRemaining,
  onInputChange,
  onKeyDown,
  onSendMessage,
  onVoiceTranscript
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isDisabled = Boolean(
    isStreaming ||                                        
    canSendMessage === false ||                         
    (rateLimitStatus && rateLimitStatus.allowed === false) || 
    (rateLimitStatus && rateLimitStatus.isBlocked === true)   
  );
  
  const getRemainingTime = () => {
    if (!rateLimitStatus) return 0;
    return formatTimeRemaining(rateLimitStatus.timeUntilReset);
  };

  const getBlockedTime = () => {
    if (!rateLimitStatus) return 0;
    return formatTimeRemaining(rateLimitStatus.timeUntilUnblock);
  };

  return (
    <div className="p-6 border-t border-white/20 bg-gradient-to-r from-white/90 to-conab-light-background/90 backdrop-blur-sm">
      {rateLimitStatus && rateLimitStatus.remaining <= 2 && rateLimitStatus.remaining > 0 && rateLimitStatus.allowed && (
        <div className="mb-4 p-3 bg-yellow-100/80 border border-yellow-300/50 rounded-xl text-yellow-800 text-sm backdrop-blur-sm">
          ⚠️ Rate limit warning: {rateLimitStatus.remaining} requests remaining. 
          Reset in {getRemainingTime()}
        </div>
      )}
      
      {rateLimitStatus && !rateLimitStatus.allowed && !rateLimitStatus.isBlocked && (
        <div className="mb-4 p-4 bg-red-100/90 border-2 border-red-400/60 rounded-xl text-red-900 text-base font-medium backdrop-blur-sm shadow-lg">
          🚫 <strong>Rate limit exceeded!</strong> Please wait {getRemainingTime()} before trying again.
        </div>
      )}
      
      {rateLimitStatus && rateLimitStatus.isBlocked && (
        <div className="mb-4 p-4 bg-red-100/90 border-2 border-red-500/60 rounded-xl text-red-900 text-base font-medium backdrop-blur-sm shadow-lg">
          🚫 <strong>You are blocked!</strong> Blocked for {getBlockedTime()} due to invalid messages. Please wait before trying again.
        </div>
      )}
      
      {rateLimitLoading && (
        <div className="mb-4 p-3 bg-blue-100/80 border border-blue-300/50 rounded-xl text-blue-800 text-sm backdrop-blur-sm">
          ⏳ Checking rate limit status...
        </div>
      )}
      
      <div className={`flex items-end space-x-3 backdrop-blur-sm rounded-2xl p-4 border shadow-lg ${
        isDisabled 
          ? 'bg-gray-200/60 border-gray-300/50 opacity-75' 
          : 'bg-white/60 border-white/30'
      }`}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={onInputChange}
          onKeyDown={onKeyDown}
          placeholder={
            rateLimitStatus && rateLimitStatus.isBlocked 
              ? "🚫 You are currently blocked from sending messages" 
              : rateLimitStatus && !rateLimitStatus.allowed
              ? "⏱️ Rate limit exceeded - please wait"
              : isDisabled
              ? "Please wait..."
              : "Ask me anything about surrogacy, egg donation, or intended parenting..."
          }
          className={`flex-1 px-0 py-2 border-none bg-transparent focus:outline-none resize-none text-base leading-relaxed ${
            isDisabled 
              ? 'text-gray-500 placeholder-gray-400 cursor-not-allowed'
              : 'text-gray-800 placeholder-gray-500'
          }`}
          rows={1}
          style={{ minHeight: '48px', maxHeight: '200px' }}
          disabled={isDisabled}
        />
        <div className="flex items-center space-x-2">
          <VoiceInput onTranscript={onVoiceTranscript} disabled={isDisabled || false} />
          <button
            onClick={onSendMessage}
            disabled={isDisabled || !input.trim()}
            className={`w-12 h-12 rounded-xl focus:outline-none transition-all duration-200 flex items-center justify-center shadow-lg ${
              isDisabled || !input.trim()
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed opacity-60'
                : 'bg-gradient-to-br from-conab-action to-conab-action-lighten text-white hover:from-conab-action-lighten hover:to-conab-action focus:ring-2 focus:ring-conab-action/50 hover:scale-105'
            }`}
            title={
              rateLimitStatus && rateLimitStatus.isBlocked
                ? "Blocked - cannot send messages"
                : rateLimitStatus && !rateLimitStatus.allowed
                ? "Rate limit exceeded"
                : isDisabled
                ? "Please wait..."
                : !input.trim()
                ? "Enter a message to send"
                : "Send message"
            }
          >
            {isStreaming ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : rateLimitStatus && rateLimitStatus.isBlocked ? (
              <span className="text-xs">🚫</span>
            ) : rateLimitStatus && !rateLimitStatus.allowed ? (
              <span className="text-xs">⏱️</span>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
