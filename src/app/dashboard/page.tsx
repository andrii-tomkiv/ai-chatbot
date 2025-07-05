'use client';

import { useState } from 'react';
import ABTestingDashboard from '@/tools/ab-testing/components/ABTestingDashboard';

type Tab = 'overview' | 'ab-testing' | 'analytics';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>('ab-testing');

  return (
    <div className="min-h-screen bg-gradient-to-br from-conab-light-background via-white to-conab-light-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-conab-header mb-2">ConceiveAbilities AI Dashboard</h1>
          <p className="text-conab-header/70">Evaluate and optimize your AI chatbot performance</p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm border border-conab-header/20 mb-6">
          <div className="border-b border-conab-header/20">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-conab-action text-conab-action'
                    : 'border-transparent text-conab-header/60 hover:text-conab-header hover:border-conab-header/30'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('ab-testing')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'ab-testing'
                    ? 'border-conab-action text-conab-action'
                    : 'border-transparent text-conab-header/60 hover:text-conab-header hover:border-conab-header/30'
                }`}
              >
                A/B Testing
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'analytics'
                    ? 'border-conab-action text-conab-action'
                    : 'border-transparent text-conab-header/60 hover:text-conab-header hover:border-conab-header/30'
                }`}
              >
                Analytics
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="text-center py-12">
                <h2 className="text-2xl font-semibold text-conab-header mb-4">Dashboard Overview</h2>
                <p className="text-conab-header/70">Overview metrics and statistics will be displayed here.</p>
              </div>
            )}

            {activeTab === 'ab-testing' && <ABTestingDashboard />}

            {activeTab === 'analytics' && (
              <div className="text-center py-12">
                <h2 className="text-2xl font-semibold text-conab-header mb-4">Analytics</h2>
                <p className="text-conab-header/70">Detailed analytics and insights will be displayed here.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 