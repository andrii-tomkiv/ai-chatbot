interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  blockDurationMs?: number;
  spamThreshold?: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  blockedUntil?: number;
  spamCount: number;
  lastSpamTime: number;
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
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  private loadFromStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
          const data = JSON.parse(stored);
          const now = Date.now();
          
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

    if (entry.count >= this.config.maxRequests) {
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

    if (now - entry.lastSpamTime > 5 * 60 * 1000) {
      entry.spamCount = 0;
    }

    entry.spamCount++;
    entry.lastSpamTime = now;

    if (this.config.spamThreshold && entry.spamCount >= this.config.spamThreshold) {
      const blockDuration = this.config.blockDurationMs || 10 * 60 * 1000;
      entry.blockedUntil = now + blockDuration;
      this.saveToStorage();
      return { shouldBlock: true, blockDuration };
    }

    this.saveToStorage();
    return { shouldBlock: false };
  }
}

export const chatRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 5,
  blockDurationMs: 10 * 60 * 1000,
  spamThreshold: 3
}, 'chat-rate-limiter');

export const embeddingRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 3,
  blockDurationMs: 15 * 60 * 1000,
  spamThreshold: 2
}, 'embedding-rate-limiter');

export const generalRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 15,
  blockDurationMs: 5 * 60 * 1000,
  spamThreshold: 5
}, 'general-rate-limiter'); 