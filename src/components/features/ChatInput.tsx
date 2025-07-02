import React, { useRef } from 'react';
import VoiceInput from '../VoiceInput';

interface ChatInputProps {
  input: string;
  isStreaming: boolean;
  rateLimitInfo: { remaining: number; resetTime: number } | null;
  isBlocked: boolean;
  blockMessage: string | null;
  onInputChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
  onSendMessage: () => void;
  onVoiceTranscript: (transcript: string) => void;
}

export default function ChatInput({
  input,
  isStreaming,
  rateLimitInfo,
  isBlocked,
  blockMessage,
  onInputChange,
  onKeyDown,
  onSendMessage,
  onVoiceTranscript
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Check if input should be disabled
  const isDisabled = Boolean(isStreaming || isBlocked || (rateLimitInfo && rateLimitInfo.remaining === 0));
  
  // Get remaining time for rate limit
  const getRemainingTime = () => {
    if (!rateLimitInfo) return 0;
    return Math.ceil((rateLimitInfo.resetTime - Date.now()) / 1000);
  };

  return (
    <div className="p-6 border-t border-white/20 bg-gradient-to-r from-white/90 to-conab-light-background/90 backdrop-blur-sm">
      {/* Rate limit warning */}
      {rateLimitInfo && rateLimitInfo.remaining <= 2 && rateLimitInfo.remaining > 0 && (
        <div className="mb-4 p-3 bg-yellow-100/80 border border-yellow-300/50 rounded-xl text-yellow-800 text-sm backdrop-blur-sm">
          ⚠️ Rate limit warning: {rateLimitInfo.remaining} requests remaining. 
          Reset in {getRemainingTime()}s
        </div>
      )}
      
      {/* Rate limit exceeded */}
      {rateLimitInfo && rateLimitInfo.remaining === 0 && (
        <div className="mb-4 p-3 bg-red-100/80 border border-red-300/50 rounded-xl text-red-800 text-sm backdrop-blur-sm">
          🚫 Rate limit exceeded. Please wait {getRemainingTime()} seconds before trying again.
        </div>
      )}
      
      {/* Blocked message */}
      {isBlocked && blockMessage && (
        <div className="mb-4 p-3 bg-red-100/80 border border-red-300/50 rounded-xl text-red-800 text-sm backdrop-blur-sm">
          🚫 {blockMessage}
        </div>
      )}
      
      <div className="flex items-end space-x-3 bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-white/30 shadow-lg">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={onInputChange}
          onKeyDown={onKeyDown}
          placeholder={isBlocked ? "You are currently blocked from sending messages" : "Ask me anything about surrogacy, egg donation, or intended parenting..."}
          className="flex-1 px-0 py-0 border-none bg-transparent focus:outline-none resize-none text-gray-800 placeholder-gray-500 disabled:opacity-50"
          rows={1}
          style={{ minHeight: '24px', maxHeight: '120px' }}
          disabled={isDisabled}
        />
        <div className="flex items-center space-x-2">
          <VoiceInput onTranscript={onVoiceTranscript} disabled={isDisabled || false} />
          <button
            onClick={onSendMessage}
            disabled={isDisabled || !input.trim()}
            className="w-12 h-12 bg-gradient-to-br from-conab-action to-conab-action-lighten text-white rounded-xl hover:from-conab-action-lighten hover:to-conab-action focus:outline-none focus:ring-2 focus:ring-conab-action/50 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center shadow-lg"
          >
            {isStreaming ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : isBlocked ? (
              <span className="text-xs">🚫</span>
            ) : rateLimitInfo && rateLimitInfo.remaining === 0 ? (
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