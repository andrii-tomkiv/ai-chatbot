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
    <div className="mt-2 flex items-center space-x-2">
      <div className="flex space-x-1">
        <button
          onClick={() => onRegenerate(messageIndex, 'quick')}
          disabled={isStreaming || isRegenerating}
          className="px-2 py-1 text-xs bg-conab-action text-white rounded hover:bg-conab-action-lighten disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Regenerate with same approach"
        >
          {isRegenerating ? (
            <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            '🔄'
          )}
        </button>
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDropdownToggle(messageIndex);
            }}
            disabled={isStreaming}
            className="px-2 py-1 text-xs bg-conab-middle-blue text-white rounded hover:bg-conab-dark-blue disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="More regeneration options"
          >
            ⋯
          </button>
          {openDropdownIndex === messageIndex && (
            <div className="absolute bottom-full left-0 mb-1 bg-white border border-conab-middle-blue rounded-lg shadow-lg z-20 min-w-40">
              <div className="p-1 space-y-1">
                <button
                  onClick={() => {
                    onRegenerate(messageIndex, 'detailed');
                    onDropdownToggle(messageIndex);
                  }}
                  disabled={isStreaming}
                  className="w-full text-left px-2 py-1 text-xs text-conab-dark-blue hover:bg-conab-light-background rounded transition-colors"
                >
                  📝 More detailed
                </button>
                <button
                  onClick={() => {
                    onRegenerate(messageIndex, 'concise');
                    onDropdownToggle(messageIndex);
                  }}
                  disabled={isStreaming}
                  className="w-full text-left px-2 py-1 text-xs text-conab-dark-blue hover:bg-conab-light-background rounded transition-colors"
                >
                  ✂️ More concise
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 