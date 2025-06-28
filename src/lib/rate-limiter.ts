interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  blockDurationMs?: number; // How long to block after limit exceeded
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  blockedUntil?: number;
}

export class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  isAllowed(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const entry = this.store.get(identifier);

    // Check if currently blocked
    if (entry?.blockedUntil && now < entry.blockedUntil) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.blockedUntil
      };
    }

    // Check if window has expired
    if (!entry || now > entry.resetTime) {
      this.store.set(identifier, {
        count: 1,
        resetTime: now + this.config.windowMs
      });
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime: now + this.config.windowMs
      };
    }

    // Check if limit exceeded
    if (entry.count >= this.config.maxRequests) {
      // Block the user if block duration is configured
      if (this.config.blockDurationMs) {
        entry.blockedUntil = now + this.config.blockDurationMs;
      }
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime
      };
    }

    // Increment count
    entry.count++;
    return {
      allowed: true,
      remaining: this.config.maxRequests - entry.count,
      resetTime: entry.resetTime
    };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [identifier, entry] of this.store.entries()) {
      // Remove entries that are past their reset time and not blocked
      if (now > entry.resetTime && (!entry.blockedUntil || now > entry.blockedUntil)) {
        this.store.delete(identifier);
      }
    }
  }

  getStats(identifier: string): RateLimitEntry | null {
    return this.store.get(identifier) || null;
  }

  reset(identifier: string): void {
    this.store.delete(identifier);
  }
}

// Create rate limiters for different purposes
export const chatRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 requests per minute
  blockDurationMs: 5 * 60 * 1000 // Block for 5 minutes if exceeded
});

export const embeddingRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 5, // 5 embedding requests per minute
  blockDurationMs: 10 * 60 * 1000 // Block for 10 minutes if exceeded
});

export const generalRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30, // 30 general requests per minute
  blockDurationMs: 2 * 60 * 1000 // Block for 2 minutes if exceeded
}); 