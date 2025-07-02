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
    <div className="p-6 border-b border-white/20 bg-gradient-to-r from-conab-header/90 to-conab-middle-blue/90 backdrop-blur-sm z-20">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-gradient-to-br from-conab-action to-conab-action-lighten rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-lg">AI</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">ConceiveAbilities Assistant</h2>
            {(currentModel || currentTemperature !== undefined) && (
              <div className="text-sm text-white/80 mt-1 flex items-center space-x-3">
                {currentModel && (
                  <span className="bg-white/20 px-2 py-1 rounded-full text-xs">
                    {currentModel}
                  </span>
                )}
                {currentTemperature !== undefined && (
                  <span className="bg-white/20 px-2 py-1 rounded-full text-xs">
                    Temp: {currentTemperature}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {settingsComponent}
          <button
            onClick={onClearConversation}
            className="px-4 py-2 text-sm bg-white/20 text-white rounded-xl hover:bg-white/30 transition-all duration-200 hover:scale-105 backdrop-blur-sm"
            title="Clear conversation"
          >
            Clear Chat
          </button>
        </div>
      </div>
    </div>
  );
} 