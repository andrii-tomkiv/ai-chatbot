import React, { useRef } from 'react';
import VoiceInput from '../VoiceInput';

interface ChatInputProps {
  input: string;
  isStreaming: boolean;
  rateLimitInfo: { remaining: number; resetTime: number } | null;
  onInputChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
  onSendMessage: () => void;
  onVoiceTranscript: (transcript: string) => void;
}

export default function ChatInput({
  input,
  isStreaming,
  rateLimitInfo,
  onInputChange,
  onKeyDown,
  onSendMessage,
  onVoiceTranscript
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  return (
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
          onChange={onInputChange}
          onKeyDown={onKeyDown}
          placeholder="Type your message... (Shift+Enter for new line)"
          className="flex-1 px-3 py-2 border border-conab-middle-blue rounded-lg focus:outline-none focus:ring-2 focus:ring-conab-action focus:border-conab-action text-conab-dark-blue bg-white resize-none"
          rows={1}
          style={{ minHeight: '40px', maxHeight: '120px' }}
          disabled={isStreaming}
        />
        <VoiceInput onTranscript={onVoiceTranscript} disabled={isStreaming} />
        <button
          onClick={onSendMessage}
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
  );
} 