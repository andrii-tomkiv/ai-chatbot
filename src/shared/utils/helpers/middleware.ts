import { NextRequest, NextResponse } from 'next/server';
import { chatRateLimiter, embeddingRateLimiter, generalRateLimiter } from '../../../domains/moderation/services/rate-limiter';

export function getClientIdentifier(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  
  let ip = forwarded?.split(',')[0] || realIp || cfConnectingIp || 'unknown';
  
  ip = ip.trim();
  
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  return `${ip}:${userAgent.substring(0, 50)}`;
}

export function rateLimitMiddleware(request: NextRequest, type: 'chat' | 'embedding' | 'general' = 'general') {
  const identifier = getClientIdentifier(request);
  
  let limiter;
  switch (type) {
    case 'chat':
      limiter = chatRateLimiter;
      break;
    case 'embedding':
      limiter = embeddingRateLimiter;
      break;
    default:
      limiter = generalRateLimiter;
  }
  
  const result = limiter.isAllowed(identifier);
  
  if (!result.allowed) {
    const response = NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
        resetTime: result.resetTime,
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
      },
      { status: 429 }
    );
    
    response.headers.set('X-RateLimit-Limit', '10');
    response.headers.set('X-RateLimit-Remaining', '0');
    response.headers.set('X-RateLimit-Reset', result.resetTime.toString());
    response.headers.set('Retry-After', Math.ceil((result.resetTime - Date.now()) / 1000).toString());
    
    return response;
  }
  
  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', '10');
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
  response.headers.set('X-RateLimit-Reset', result.resetTime.toString());
  
  return response;
}

export function spamDetectionMiddleware(request: NextRequest): NextResponse | null {
  const identifier = getClientIdentifier(request);
  
  const userAgent = request.headers.get('user-agent') || '';
  const contentType = request.headers.get('content-type') || '';
  
  const botPatterns = [
    /bot/i, /crawler/i, /spider/i, /scraper/i, /curl/i, /wget/i,
    /python/i, /java/i, /perl/i, /ruby/i, /php/i, /go-http-client/i
  ];
  
  if (botPatterns.some(pattern => pattern.test(userAgent))) {
    console.log(`🚫 Blocked bot request from ${identifier}: ${userAgent}`);
    return NextResponse.json(
      { error: 'Access denied' },
      { status: 403 }
    );
  }
  
  const now = Date.now();
  const lastRequest = request.headers.get('x-last-request');
  if (lastRequest) {
    const timeDiff = now - parseInt(lastRequest);
    if (timeDiff < 1000) { // Less than 1 second
      console.log(`🚫 Blocked rapid request from ${identifier}: ${timeDiff}ms`);
      return NextResponse.json(
        { error: 'Too many rapid requests' },
        { status: 429 }
      );
    }
  }
  
  return null;
}

export function contentValidationMiddleware(request: NextRequest): NextResponse | null {
  try {
    if (request.method === 'POST') {
      const contentType = request.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        const contentLength = request.headers.get('content-length');
        if (contentLength && parseInt(contentLength) > 10000) { // 10KB limit
          return NextResponse.json(
            { error: 'Request too large' },
            { status: 413 }
          );
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Content validation error:', error);
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
} 