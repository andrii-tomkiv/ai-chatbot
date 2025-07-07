'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ABTestingDashboard from '@/tools/ab-testing/components/ABTestingDashboard';
import UserRequestsDashboard from './components/UserRequestsDashboard';

type Tab = 'overview' | 'ab-testing' | 'analytics' | 'user-requests';

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('ab-testing');

  return (
    <div className="min-h-screen bg-gradient-to-br from-conab-light-background via-white to-conab-light-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-conab-header mb-2">ConceiveAbilities AI Dashboard</h1>
              <p className="text-conab-header/70">Evaluate and optimize your AI chatbot performance</p>
            </div>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-conab-action hover:bg-conab-action-dark text-white rounded-lg font-medium transition-colors duration-200 shadow-sm hover:shadow-md flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back to Chat</span>
            </button>
          </div>
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
              <button
                onClick={() => setActiveTab('user-requests')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'user-requests'
                    ? 'border-conab-action text-conab-action'
                    : 'border-transparent text-conab-header/60 hover:text-conab-header hover:border-conab-header/30'
                }`}
              >
                User Requests
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

            {activeTab === 'user-requests' && <UserRequestsDashboard />}
          </div>
        </div>
      </div>
    </div>
  );
} 