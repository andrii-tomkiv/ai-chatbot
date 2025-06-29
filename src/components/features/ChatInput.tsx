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
    <div className="p-4 border-t border-conab-middle-blue bg-conab-light-background rounded-b-lg">
      {/* Rate limit warning */}
      {rateLimitInfo && rateLimitInfo.remaining <= 2 && rateLimitInfo.remaining > 0 && (
        <div className="mb-3 p-2 bg-yellow-100 border border-yellow-300 rounded text-yellow-800 text-xs">
          ⚠️ Rate limit warning: {rateLimitInfo.remaining} requests remaining. 
          Reset in {getRemainingTime()}s
        </div>
      )}
      
      {/* Rate limit exceeded */}
      {rateLimitInfo && rateLimitInfo.remaining === 0 && (
        <div className="mb-3 p-2 bg-red-100 border border-red-300 rounded text-red-800 text-xs">
          🚫 Rate limit exceeded. Please wait {getRemainingTime()} seconds before trying again.
        </div>
      )}
      
      {/* Blocked message */}
      {isBlocked && blockMessage && (
        <div className="mb-3 p-2 bg-red-100 border border-red-300 rounded text-red-800 text-xs">
          🚫 {blockMessage}
        </div>
      )}
      
      <div className="flex space-x-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={onInputChange}
          onKeyDown={onKeyDown}
          placeholder={isBlocked ? "You are currently blocked from sending messages" : "Type your message... (Shift+Enter for new line)"}
          className="flex-1 px-3 py-2 border border-conab-middle-blue rounded-lg focus:outline-none focus:ring-2 focus:ring-conab-action focus:border-conab-action text-conab-dark-blue bg-white resize-none disabled:opacity-50 disabled:bg-gray-100"
          rows={1}
          style={{ minHeight: '40px', maxHeight: '120px' }}
          disabled={isDisabled}
        />
        <VoiceInput onTranscript={onVoiceTranscript} disabled={isDisabled || false} />
        <button
          onClick={onSendMessage}
          disabled={isDisabled || !input.trim()}
          className="px-4 py-2 bg-conab-action text-white rounded-lg hover:bg-conab-action-lighten focus:outline-none focus:ring-2 focus:ring-conab-action transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isStreaming ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : isBlocked ? (
            'Blocked'
          ) : rateLimitInfo && rateLimitInfo.remaining === 0 ? (
            'Rate Limited'
          ) : (
            'Send'
          )}
        </button>
      </div>
    </div>
  );
} 