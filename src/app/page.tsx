'use client';

import { useState } from 'react';
import ChatBox from '@/components/ChatBox';

export default function Home() {
  const [chatKey, setChatKey] = useState(0);

  const handleQuickAction = (action: string) => {
    // Force re-render of ChatBox with new key to trigger URL change
    setChatKey(prev => prev + 1);
    
    // Update URL with the action as a query parameter
    const url = new URL(window.location.href);
    url.searchParams.set('action', action);
    window.history.pushState({}, '', url.toString());
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-conab-light-background to-white">
      {/* Header */}
      <header className="bg-conab-header text-white py-6 shadow-lg">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">ConceiveAbilities AI Assistant</h1>
              <p className="text-white/80 mt-1">Your trusted guide for surrogacy and egg donation information</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-white/70">Powered by Mistral AI</div>
              <div className="text-xs text-white/50">Real-time semantic search</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chat Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="h-[600px]">
                <ChatBox key={chatKey} />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-conab-dark-blue mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button 
                  onClick={() => handleQuickAction('surrogacy')}
                  className="w-full text-left p-3 bg-conab-light-background rounded-lg hover:bg-conab-action hover:text-white transition-colors"
                >
                  <div className="font-medium">Surrogacy Information</div>
                  <div className="text-sm opacity-70">Learn about becoming a surrogate</div>
                </button>
                <button 
                  onClick={() => handleQuickAction('egg-donation')}
                  className="w-full text-left p-3 bg-conab-light-background rounded-lg hover:bg-conab-action hover:text-white transition-colors"
                >
                  <div className="font-medium">Egg Donation</div>
                  <div className="text-sm opacity-70">Information for egg donors</div>
                </button>
                <button 
                  onClick={() => handleQuickAction('intended-parents')}
                  className="w-full text-left p-3 bg-conab-light-background rounded-lg hover:bg-conab-action hover:text-white transition-colors"
                >
                  <div className="font-medium">Intended Parents</div>
                  <div className="text-sm opacity-70">Services for intended parents</div>
                </button>
              </div>
            </div>

            {/* Chat Modes */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-conab-dark-blue mb-4">Chat Modes</h3>
              <div className="space-y-2">
                <a href="?prompt=default" className="block p-2 text-sm text-conab-dark-blue hover:bg-conab-light-background rounded">
                  Default Assistant
                </a>
                <a href="?prompt=customerService" className="block p-2 text-sm text-conab-dark-blue hover:bg-conab-light-background rounded">
                  Customer Service
                </a>
                <a href="?prompt=technical" className="block p-2 text-sm text-conab-dark-blue hover:bg-conab-light-background rounded">
                  Technical Support
                </a>
                <a href="?prompt=sales" className="block p-2 text-sm text-conab-dark-blue hover:bg-conab-light-background rounded">
                  Sales Consultation
                </a>
                <a href="?prompt=educational" className="block p-2 text-sm text-conab-dark-blue hover:bg-conab-light-background rounded">
                  Educational
                </a>
              </div>
            </div>

            {/* Stats */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-conab-dark-blue mb-4">Knowledge Base</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span>Indexed Pages:</span>
                  <span className="font-medium">500+</span>
                </div>
                <div className="flex justify-between">
                  <span>Content Chunks:</span>
                  <span className="font-medium">2,000+</span>
                </div>
                <div className="flex justify-between">
                  <span>Last Updated:</span>
                  <span className="font-medium">Today</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
