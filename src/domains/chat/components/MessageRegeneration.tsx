import React from 'react';

interface MessageRegenerationProps {
  messageIndex: number;
  isStreaming: boolean;
  regeneratingMessageId: string | null;
  openDropdownIndex: number | null;
  onRegenerate: (index: number, strategy: 'quick' | 'detailed' | 'concise') => void;
  onDropdownToggle: (index: number) => void;
}

export default function MessageRegeneration({
  messageIndex,
  isStreaming,
  regeneratingMessageId,
  openDropdownIndex,
  onRegenerate,
  onDropdownToggle
}: MessageRegenerationProps) {
  const messageId = `msg-${messageIndex}`;
  const isRegenerating = regeneratingMessageId === messageId;

  return (
    <div className="flex items-center space-x-2">
      <div className="flex items-center space-x-1">
        <button
          onClick={() => onRegenerate(messageIndex, 'quick')}
          disabled={isStreaming || isRegenerating}
          className="p-2 text-xs bg-white/80 backdrop-blur-sm border border-white/50 text-gray-600 rounded-xl hover:bg-conab-action/10 hover:border-conab-action/30 hover:text-conab-action disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
          title="Regenerate with same approach"
        >
          {isRegenerating ? (
            <div className="w-3 h-3 border border-conab-action border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
        </button>
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDropdownToggle(messageIndex);
            }}
            disabled={isStreaming}
            className="p-2 text-xs bg-white/80 backdrop-blur-sm border border-white/50 text-gray-600 rounded-xl hover:bg-conab-action/10 hover:border-conab-action/30 hover:text-conab-action disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
            title="More regeneration options"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
          {openDropdownIndex === messageIndex && (
            <div className="absolute bottom-full left-0 mb-2 bg-white/95 backdrop-blur-sm border border-white/50 rounded-2xl shadow-xl z-20 min-w-48 overflow-hidden">
              <div className="p-2 space-y-1">
                <button
                  onClick={() => {
                    onRegenerate(messageIndex, 'detailed');
                    onDropdownToggle(messageIndex);
                  }}
                  disabled={isStreaming}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-conab-action/10 hover:text-conab-action rounded-xl transition-all duration-200 flex items-center space-x-2"
                >
                  <span className="text-lg">📝</span>
                  <span>More detailed</span>
                </button>
                <button
                  onClick={() => {
                    onRegenerate(messageIndex, 'concise');
                    onDropdownToggle(messageIndex);
                  }}
                  disabled={isStreaming}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-conab-action/10 hover:text-conab-action rounded-xl transition-all duration-200 flex items-center space-x-2"
                >
                  <span className="text-lg">✂️</span>
                  <span>More concise</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 