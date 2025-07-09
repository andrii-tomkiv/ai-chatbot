'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface PromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  promptValue: string;
  onSave: (prompt: string) => void;
}

export default function PromptModal({ isOpen, onClose, promptValue, onSave }: PromptModalProps) {
  const [localPrompt, setLocalPrompt] = useState(promptValue);

  useEffect(() => {
    setLocalPrompt(promptValue);
  }, [promptValue]);

  const handleSave = () => {
    onSave(localPrompt);
    onClose();
  };

  const handleCancel = () => {
    setLocalPrompt(promptValue);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bottom-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-xl border border-white/50 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden mx-auto my-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-800">Custom System Prompt</h3>
          <button
            onClick={handleCancel}
            className="w-8 h-8 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              System Prompt
            </label>
            <textarea
              value={localPrompt}
              onChange={(e) => setLocalPrompt(e.target.value)}
              placeholder="Enter your custom system prompt here. This will override the default prompt and be used for all conversations..."
              className="w-full h-64 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-conab-action focus:border-conab-action resize-none text-sm"
            />
          </div>
          
          <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-xl">
            <p className="font-semibold mb-2">Tips:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Define the AI's role and personality</li>
              <li>Set clear guidelines for responses</li>
              <li>Specify the tone and style you want</li>
              <li>Include any specific instructions or constraints</li>
            </ul>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all duration-200 hover:scale-105"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-gradient-to-r from-conab-action to-conab-action-lighten text-white rounded-xl hover:from-conab-action-lighten hover:to-conab-action transition-all duration-200 hover:scale-105"
          >
            Save Prompt
          </button>
        </div>
      </div>
    </div>
  );
}