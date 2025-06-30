import React from 'react';

interface ChatHeaderProps {
  onClearConversation: () => void;
  settingsComponent?: React.ReactNode;
  currentModel?: string;
  currentTemperature?: number;
}

export default function ChatHeader({ 
  onClearConversation, 
  settingsComponent,
  currentModel,
  currentTemperature 
}: ChatHeaderProps) {
  return (
    <div className="p-4 border-b bg-conab-header rounded-t-lg">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h2 className="text-lg font-semibold text-white">AI Assistant</h2>
          {(currentModel || currentTemperature !== undefined) && (
            <div className="text-xs text-white/70 mt-1">
              {currentModel && <span className="mr-2">Model: {currentModel}</span>}
              {currentTemperature !== undefined && (
                <span>Temp: {currentTemperature}</span>
              )}
            </div>
          )}
        </div>
        <div className="flex space-x-2">
          {settingsComponent}
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