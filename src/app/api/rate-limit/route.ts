import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { chatRateLimiter } from "@/domains/moderation/services/rate-limiter";

// Helper function to get request info for rate limiting
async function getRequestInfo() {
  const headersList = await headers();
  const forwarded = headersList.get('x-forwarded-for');
  const realIp = headersList.get('x-real-ip');
  const cfConnectingIp = headersList.get('cf-connecting-ip');
  const userAgent = headersList.get('user-agent') || 'unknown';
  
  let ip = forwarded?.split(',')[0] || realIp || cfConnectingIp || 'unknown';
  ip = ip.trim();
  
  return `${ip}:${userAgent.substring(0, 50)}`;
}

export async function GET(request: NextRequest) {
  try {
    const identifier = await getRequestInfo();
    const status = chatRateLimiter.getStatus(identifier);
    
    return NextResponse.json({
      success: true,
      status: {
        allowed: status.allowed,
        remaining: status.remaining,
        resetTime: status.resetTime,
        isBlocked: status.isBlocked,
        blockedUntil: status.blockedUntil,
        windowMs: status.windowMs,
        maxRequests: status.maxRequests,
        timeUntilReset: Math.max(0, status.resetTime - Date.now()),
        timeUntilUnblock: status.blockedUntil ? Math.max(0, status.blockedUntil - Date.now()) : 0
      }
    });
  } catch (error) {
    console.error('Rate limit status check error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to check rate limit status',
        status: {
          allowed: true, // Default to allowed if check fails
          remaining: 5,
          resetTime: Date.now() + 60000,
          isBlocked: false,
          windowMs: 60000,
          maxRequests: 5,
          timeUntilReset: 60000,
          timeUntilUnblock: 0
        }
      },
      { status: 500 }
    );
  }
} 