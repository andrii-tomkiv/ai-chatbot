'use client';

import {useEffect, useState} from 'react';

interface UserRequest {
  id: number;
  userIP: string;
  message: string;
  response: string;
  date: string;
}

interface UserRequestsDashboardProps {}

export default function UserRequestsDashboard({}: UserRequestsDashboardProps) {
  const [userIPs, setUserIPs] = useState<string[]>([]);
  const [selectedIP, setSelectedIP] = useState<string | null>(null);
  const [userRequests, setUserRequests] = useState<UserRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedResponses, setExpandedResponses] = useState<Set<number>>(new Set());

  // Load unique IP addresses
  useEffect(() => {
    fetchUniqueIPs();
  }, []);

  // Load requests for selected user
  useEffect(() => {
    if (selectedIP) {
      fetchUserRequests(selectedIP);
    }
  }, [selectedIP]);

  const fetchUniqueIPs = async () => {
    try {
      const response = await fetch('/api/user-requests/ips');
      if (response.ok) {
        const data = await response.json();
        setUserIPs(data.ips);
      }
    } catch (error) {
      console.error('Failed to fetch unique IPs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserRequests = async (ip: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/user-requests/by-ip?ip=${encodeURIComponent(ip)}`);
      if (response.ok) {
        const data = await response.json();
        setUserRequests(data.requests);
      }
    } catch (error) {
      console.error('Failed to fetch user requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const toggleResponseExpansion = (requestId: number) => {
    setExpandedResponses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(requestId)) {
        newSet.delete(requestId);
      } else {
        newSet.add(requestId);
      }
      return newSet;
    });
  };

  const isResponseExpanded = (requestId: number) => {
    return expandedResponses.has(requestId);
  };

  return (
    <div className="flex h-[600px] bg-white rounded-lg shadow-sm border border-conab-header/20">
      {/* Sidebar with unique IPs */}
      <div className="w-64 border-r border-conab-header/20 bg-gray-50">
        <div className="p-4 border-b border-conab-header/20">
          <h3 className="text-lg font-semibold text-conab-header">User IPs</h3>
          <p className="text-sm text-conab-header/60 mt-1">
            {userIPs.length} unique users
          </p>
        </div>
        
        <div className="overflow-y-auto h-full">
          {loading ? (
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-conab-action mx-auto"></div>
              <p className="text-sm text-conab-header/60 mt-2">Loading...</p>
            </div>
          ) : (
            <div className="p-2">
              {userIPs.map((ip) => (
                <button
                  key={ip}
                  onClick={() => setSelectedIP(ip)}
                  className={`w-full text-left p-3 rounded-lg mb-2 transition-all duration-200 ${
                    selectedIP === ip
                      ? 'bg-conab-action text-white shadow-md'
                      : 'bg-white text-conab-header hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <div className="font-medium text-sm">{ip}</div>
                  <div className={`text-xs mt-1 ${
                    selectedIP === ip ? 'text-white/80' : 'text-conab-header/60'
                  }`}>
                    Click to view requests
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {selectedIP ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-conab-header/20">
              <h3 className="text-lg font-semibold text-conab-header">
                Requests from {selectedIP}
              </h3>
              <p className="text-sm text-conab-header/60 mt-1">
                {userRequests.length} requests
              </p>
            </div>

            {/* Requests list */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-conab-action mx-auto"></div>
                  <p className="text-conab-header/60 mt-2">Loading requests...</p>
                </div>
              ) : userRequests.length > 0 ? (
                <div className="space-y-4">
                  {userRequests.map((request) => (
                    <div
                      key={request.id}
                      className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="text-sm text-conab-header/60">
                          {formatDate(request.date)}
                        </div>
                        <div className="text-xs bg-conab-action/10 text-conab-action px-2 py-1 rounded">
                          ID: {request.id}
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <h4 className="text-sm font-medium text-conab-header mb-1">User Message:</h4>
                          <div className="bg-gray-50 p-3 rounded text-sm text-gray-800">
                            {request.message}
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="text-sm font-medium text-conab-header mb-1">AI Response:</h4>
                          <div className="bg-conab-light-background/30 p-3 rounded text-sm text-gray-800">
                            {isResponseExpanded(request.id) 
                              ? request.response 
                              : truncateText(request.response, 200)
                            }
                          </div>
                          {request.response.length > 200 && (
                            <button
                              onClick={() => toggleResponseExpansion(request.id)}
                              className="mt-2 text-xs text-conab-action hover:text-conab-action-dark font-medium transition-colors"
                            >
                              {isResponseExpanded(request.id) ? 'Show less' : 'Show full answer'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-conab-header/60">No requests found for this IP address.</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-4">👤</div>
              <h3 className="text-lg font-semibold text-conab-header mb-2">
                Select a User IP
              </h3>
              <p className="text-conab-header/60">
                Choose an IP address from the sidebar to view their requests
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 