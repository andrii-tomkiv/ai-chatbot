interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  blockDurationMs?: number; // How long to block after limit exceeded
  spamThreshold?: number; // Number of spam messages before blocking
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  blockedUntil?: number;
  spamCount: number; // Track spam messages
  lastSpamTime: number; // Track when last spam occurred
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
        resetTime: now + this.config.windowMs,
        spamCount: 0,
        lastSpamTime: 0
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

  // Track spam messages and potentially block
  trackSpam(identifier: string): { shouldBlock: boolean; blockDuration?: number } {
    const now = Date.now();
    const entry = this.store.get(identifier);
    
    if (!entry) {
      this.store.set(identifier, {
        count: 0,
        resetTime: now + this.config.windowMs,
        spamCount: 1,
        lastSpamTime: now
      });
      return { shouldBlock: false };
    }

    // Reset spam count if it's been a while
    if (now - entry.lastSpamTime > 5 * 60 * 1000) { // 5 minutes
      entry.spamCount = 0;
    }

    entry.spamCount++;
    entry.lastSpamTime = now;

    // Block if spam threshold exceeded
    if (this.config.spamThreshold && entry.spamCount >= this.config.spamThreshold) {
      const blockDuration = this.config.blockDurationMs || 10 * 60 * 1000; // Default 10 minutes
      entry.blockedUntil = now + blockDuration;
      return { shouldBlock: true, blockDuration };
    }

    return { shouldBlock: false };
  }
}

// Create rate limiters for different purposes
export const chatRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 5, // Reduced from 10 to 5 requests per minute
  blockDurationMs: 10 * 60 * 1000, // Increased block duration to 10 minutes
  spamThreshold: 3 // Block after 3 spam messages
});

export const embeddingRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 3, // Reduced from 5 to 3 embedding requests per minute
  blockDurationMs: 15 * 60 * 1000, // Increased block duration to 15 minutes
  spamThreshold: 2 // Block after 2 spam messages
});

export const generalRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 15, // Reduced from 30 to 15 general requests per minute
  blockDurationMs: 5 * 60 * 1000, // Increased block duration to 5 minutes
  spamThreshold: 5 // Block after 5 spam messages
}); 