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
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-32 h-32 bg-gradient-to-br from-conab-action/10 to-conab-action-lighten/10 rounded-full blur-xl"/>
        <div className="absolute bottom-20 right-20 w-24 h-24 bg-gradient-to-br from-conab-middle-blue/10 to-conab-header/10 rounded-full blur-xl"/>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-gradient-to-br from-conab-action/5 to-conab-middle-blue/5 rounded-full blur-2xl"></div>
      </div>
      
      <div className="relative z-10 max-w-2xl mx-auto">
        <div className="mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-conab-action to-conab-action-lighten rounded-3xl flex items-center justify-center mx-auto shadow-2xl">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
        
        <div className="mb-12">
          <h1 className="text-3xl font-bold text-gray-800 mb-4 bg-gradient-to-r from-conab-header to-conab-action bg-clip-text text-transparent">
            Welcome to ConceiveAbilities
          </h1>
          <p className="text-lg text-gray-600 mb-2 font-medium">
            Your AI Assistant for Surrogacy & Egg Donation
          </p>
          <p className="text-gray-500">
            I'm here to help you with information about surrogacy, egg donation, and our services.
          </p>
        </div>
        
        <div className="space-y-4">
          <p className="text-sm font-semibold text-gray-700 mb-6 uppercase tracking-wide">
            Try asking me about:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SUGGESTED_QUESTIONS.map((question, index) => (
              <button
                key={index}
                onClick={() => onQuestionClick(question)}
                className="group p-4 bg-white/70 backdrop-blur-sm border border-white/50 rounded-2xl hover:bg-gradient-to-r hover:from-conab-action/10 hover:to-conab-action-lighten/10 hover:border-conab-action/30 transition-all duration-300 hover:scale-105 hover:shadow-lg text-left"
              >
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-gradient-to-br from-conab-action to-conab-action-lighten rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">{index + 1}</span>
                  </div>
                  <span className="text-sm text-gray-700 group-hover:text-gray-900 font-medium leading-relaxed">
                    {question}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 