import { NextResponse } from 'next/server';
import { chatRateLimiter, embeddingRateLimiter, generalRateLimiter } from '@/lib/rate-limiter';

export async function GET() {
  try {
    // Get rate limit statistics
    const chatStats = Array.from(chatRateLimiter['store'].entries()).map(([identifier, entry]) => ({
      identifier: identifier.split(':')[0], // Just the IP part
      count: entry.count,
      resetTime: entry.resetTime,
      blockedUntil: entry.blockedUntil
    }));

    const embeddingStats = Array.from(embeddingRateLimiter['store'].entries()).map(([identifier, entry]) => ({
      identifier: identifier.split(':')[0],
      count: entry.count,
      resetTime: entry.resetTime,
      blockedUntil: entry.blockedUntil
    }));

    const generalStats = Array.from(generalRateLimiter['store'].entries()).map(([identifier, entry]) => ({
      identifier: identifier.split(':')[0],
      count: entry.count,
      resetTime: entry.resetTime,
      blockedUntil: entry.blockedUntil
    }));

    // Calculate summary statistics
    const summary = {
      totalChatRequests: chatStats.reduce((sum, stat) => sum + stat.count, 0),
      totalEmbeddingRequests: embeddingStats.reduce((sum, stat) => sum + stat.count, 0),
      totalGeneralRequests: generalStats.reduce((sum, stat) => sum + stat.count, 0),
      activeUsers: new Set([...chatStats, ...embeddingStats, ...generalStats].map(s => s.identifier)).size,
      blockedUsers: [...chatStats, ...embeddingStats, ...generalStats].filter(s => s.blockedUntil && s.blockedUntil > Date.now()).length,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json({
      summary,
      chatStats: chatStats.slice(0, 10), // Top 10 users
      embeddingStats: embeddingStats.slice(0, 10),
      generalStats: generalStats.slice(0, 10)
    });
  } catch (error) {
    console.error('Error getting analytics:', error);
    return NextResponse.json(
      { error: 'Failed to get analytics' },
      { status: 500 }
    );
  }
} 