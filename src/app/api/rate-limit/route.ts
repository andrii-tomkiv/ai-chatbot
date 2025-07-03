import { NextRequest, NextResponse } from "next/server";
import { getRequestInfo } from "@/shared/utils/helpers/request-utils";
import { chatRateLimiter } from "@/domains/moderation/services/rate-limiter";

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