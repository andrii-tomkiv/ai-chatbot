import React from 'react';

interface ChatHeaderProps {
  onClearConversation: () => void;
}

export default function ChatHeader({ onClearConversation }: ChatHeaderProps) {
  return (
    <div className="p-4 border-b bg-conab-header rounded-t-lg">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h2 className="text-lg font-semibold text-white">AI Assistant</h2>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={onClearConversation}
            className="px-3 py-1 text-xs bg-white/20 text-white rounded hover:bg-white/30 transition-colors"
            title="Clear conversation"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
} 