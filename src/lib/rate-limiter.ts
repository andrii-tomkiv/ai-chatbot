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

interface RateLimitStatus {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  isBlocked: boolean;
  blockedUntil?: number;
  windowMs: number;
  maxRequests: number;
}

export class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private config: RateLimitConfig;
  private storageKey: string;

  constructor(config: RateLimitConfig, storageKey: string = 'rate-limiter') {
    this.config = config;
    this.storageKey = storageKey;
    this.loadFromStorage();
    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  private loadFromStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
          const data = JSON.parse(stored);
          const now = Date.now();
          
          // Only load non-expired entries
          for (const [identifier, entry] of Object.entries(data)) {
            const rateLimitEntry = entry as RateLimitEntry;
            if (now < rateLimitEntry.resetTime && (!rateLimitEntry.blockedUntil || now < rateLimitEntry.blockedUntil)) {
              this.store.set(identifier, rateLimitEntry);
            }
          }
        }
      } catch (error) {
        console.error('Error loading rate limit data from storage:', error);
      }
    }
  }

  private saveToStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        const data: Record<string, RateLimitEntry> = {};
        for (const [identifier, entry] of this.store.entries()) {
          data[identifier] = entry;
        }
        localStorage.setItem(this.storageKey, JSON.stringify(data));
      } catch (error) {
        console.error('Error saving rate limit data to storage:', error);
      }
    }
  }

  isAllowed(identifier: string): RateLimitStatus {
    const now = Date.now();
    const entry = this.store.get(identifier);

    // Check if currently blocked
    if (entry?.blockedUntil && now < entry.blockedUntil) {
      const result = {
        allowed: false,
        remaining: 0,
        resetTime: entry.blockedUntil,
        isBlocked: true,
        blockedUntil: entry.blockedUntil,
        windowMs: this.config.windowMs,
        maxRequests: this.config.maxRequests
      };
      this.saveToStorage();
      return result;
    }

    // Check if window has expired
    if (!entry || now > entry.resetTime) {
      const newEntry = {
        count: 1,
        resetTime: now + this.config.windowMs,
        spamCount: 0,
        lastSpamTime: 0
      };
      this.store.set(identifier, newEntry);
      this.saveToStorage();
      
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime: newEntry.resetTime,
        isBlocked: false,
        windowMs: this.config.windowMs,
        maxRequests: this.config.maxRequests
      };
    }

    // Check if limit exceeded
    if (entry.count >= this.config.maxRequests) {
      // Block the user if block duration is configured
      if (this.config.blockDurationMs) {
        entry.blockedUntil = now + this.config.blockDurationMs;
      }
      this.saveToStorage();
      
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
        isBlocked: true,
        blockedUntil: entry.blockedUntil,
        windowMs: this.config.windowMs,
        maxRequests: this.config.maxRequests
      };
    }

    // Increment count
    entry.count++;
    this.saveToStorage();
    
    return {
      allowed: true,
      remaining: this.config.maxRequests - entry.count,
      resetTime: entry.resetTime,
      isBlocked: false,
      windowMs: this.config.windowMs,
      maxRequests: this.config.maxRequests
    };
  }

  getStatus(identifier: string): RateLimitStatus {
    const now = Date.now();
    const entry = this.store.get(identifier);

    if (!entry) {
      return {
        allowed: true,
        remaining: this.config.maxRequests,
        resetTime: now + this.config.windowMs,
        isBlocked: false,
        windowMs: this.config.windowMs,
        maxRequests: this.config.maxRequests
      };
    }

    // Check if currently blocked
    if (entry.blockedUntil && now < entry.blockedUntil) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.blockedUntil,
        isBlocked: true,
        blockedUntil: entry.blockedUntil,
        windowMs: this.config.windowMs,
        maxRequests: this.config.maxRequests
      };
    }

    // Check if window has expired
    if (now > entry.resetTime) {
      return {
        allowed: true,
        remaining: this.config.maxRequests,
        resetTime: now + this.config.windowMs,
        isBlocked: false,
        windowMs: this.config.windowMs,
        maxRequests: this.config.maxRequests
      };
    }

    return {
      allowed: entry.count < this.config.maxRequests,
      remaining: Math.max(0, this.config.maxRequests - entry.count),
      resetTime: entry.resetTime,
      isBlocked: false,
      windowMs: this.config.windowMs,
      maxRequests: this.config.maxRequests
    };
  }

  private cleanup(): void {
    const now = Date.now();
    let hasChanges = false;
    
    for (const [identifier, entry] of this.store.entries()) {
      // Remove entries that are past their reset time and not blocked
      if (now > entry.resetTime && (!entry.blockedUntil || now > entry.blockedUntil)) {
        this.store.delete(identifier);
        hasChanges = true;
      }
    }
    
    if (hasChanges) {
      this.saveToStorage();
    }
  }

  getStats(identifier: string): RateLimitEntry | null {
    return this.store.get(identifier) || null;
  }

  reset(identifier: string): void {
    this.store.delete(identifier);
    this.saveToStorage();
  }

  // Track spam messages and potentially block
  trackSpam(identifier: string): { shouldBlock: boolean; blockDuration?: number } {
    const now = Date.now();
    const entry = this.store.get(identifier);
    
    if (!entry) {
      const newEntry = {
        count: 0,
        resetTime: now + this.config.windowMs,
        spamCount: 1,
        lastSpamTime: now
      };
      this.store.set(identifier, newEntry);
      this.saveToStorage();
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
      this.saveToStorage();
      return { shouldBlock: true, blockDuration };
    }

    this.saveToStorage();
    return { shouldBlock: false };
  }
}

// Create rate limiters for different purposes
export const chatRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 5, // 5 requests per minute
  blockDurationMs: 10 * 60 * 1000, // 10 minutes block duration
  spamThreshold: 3 // Block after 3 spam messages
}, 'chat-rate-limiter');

export const embeddingRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 3, // 3 embedding requests per minute
  blockDurationMs: 15 * 60 * 1000, // 15 minutes block duration
  spamThreshold: 2 // Block after 2 spam messages
}, 'embedding-rate-limiter');

export const generalRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 15, // 15 general requests per minute
  blockDurationMs: 5 * 60 * 1000, // 5 minutes block duration
  spamThreshold: 5 // Block after 5 spam messages
}, 'general-rate-limiter'); 