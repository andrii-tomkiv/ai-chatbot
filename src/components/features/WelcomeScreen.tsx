import React from 'react';

const SUGGESTED_QUESTIONS = [
  "What are the requirements to become a surrogate?",
  "How does the egg donation process work?",
  "What services do you offer for intended parents?",
  "What is the surrogacy timeline?",
  "How much does surrogacy cost?",
  "What support do you provide during the process?"
];

interface WelcomeScreenProps {
  onQuestionClick: (question: string) => void;
}

export default function WelcomeScreen({ onQuestionClick }: WelcomeScreenProps) {
  return (
    <div className="text-center text-conab-dark-blue py-8">
      <div className="mb-4">
        <svg className="w-12 h-12 mx-auto text-conab-action" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
        </svg>
      </div>
      <p className="text-lg font-medium mb-2">Welcome to ConceiveAbilities AI Assistant</p>
      <p className="text-sm mb-6">I&apos;m here to help you with information about surrogacy, egg donation, and our services.</p>
      
      <div className="space-y-2">
        <p className="text-sm font-medium text-conab-dark-blue mb-3">Try asking:</p>
        <div className="grid grid-cols-1 gap-2">
          {SUGGESTED_QUESTIONS.map((question, index) => (
            <button
              key={index}
              onClick={() => onQuestionClick(question)}
              className="text-left p-3 bg-white border border-conab-middle-blue rounded-lg hover:bg-conab-action hover:text-white hover:border-conab-action transition-colors text-sm"
            >
              {question}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
} 