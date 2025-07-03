import { useState, useEffect, useCallback } from 'react';

export interface RateLimitStatus {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  isBlocked: boolean;
  blockedUntil?: number;
  windowMs: number;
  maxRequests: number;
  timeUntilReset: number;
  timeUntilUnblock: number;
}

export function useRateLimit() {
  const [status, setStatus] = useState<RateLimitStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forcedStatus, setForcedStatus] = useState<RateLimitStatus | null>(null);
  const [forcedUntil, setForcedUntil] = useState<number | null>(null);

  // Load persisted rate limit status on mount
  const loadPersistedStatus = useCallback(() => {
    try {
      const stored = localStorage.getItem('rate-limit-status');
      if (stored) {
        const parsed = JSON.parse(stored);
        const now = Date.now();
        
        // Check if stored status is still valid (not expired)
        if (parsed.expiresAt && now < parsed.expiresAt) {
          const timeRemaining = parsed.expiresAt - now;
          setForcedStatus({
            allowed: parsed.allowed,
            remaining: parsed.remaining,
            resetTime: parsed.resetTime,
            isBlocked: parsed.isBlocked,
            blockedUntil: parsed.blockedUntil,
            windowMs: parsed.windowMs,
            maxRequests: parsed.maxRequests,
            timeUntilReset: parsed.isBlocked ? 0 : timeRemaining,
            timeUntilUnblock: parsed.isBlocked ? timeRemaining : 0
          });
          setForcedUntil(parsed.expiresAt);
          return true; // Status was loaded from storage
        } else {
          // Expired, remove from storage
          localStorage.removeItem('rate-limit-status');
        }
      }
    } catch (err) {
      console.error('Error loading persisted rate limit status:', err);
      localStorage.removeItem('rate-limit-status');
    }
    return false; // No valid status in storage
  }, []);

  // Persist rate limit status to localStorage
  const persistStatus = useCallback((status: RateLimitStatus, expiresAt: number) => {
    try {
      const toStore = {
        allowed: status.allowed,
        remaining: status.remaining,
        resetTime: status.resetTime,
        isBlocked: status.isBlocked,
        blockedUntil: status.blockedUntil,
        windowMs: status.windowMs,
        maxRequests: status.maxRequests,
        expiresAt
      };
      localStorage.setItem('rate-limit-status', JSON.stringify(toStore));
    } catch (err) {
      console.error('Error persisting rate limit status:', err);
    }
  }, []);

  const checkRateLimit = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Don't override forced status until it expires
      const now = Date.now();
      if (forcedUntil && now < forcedUntil) {
        setLoading(false);
        return; // Keep forced status active
      }
      
      // If forced status has expired, clear it
      if (forcedUntil && now >= forcedUntil) {
        setForcedStatus(null);
        setForcedUntil(null);
        // Clean up localStorage
        localStorage.removeItem('rate-limit-status');
      }
      
      const response = await fetch('/api/rate-limit');
      const data = await response.json();
      
      if (data.success) {
        setStatus(data.status);
      } else {
        setError(data.error || 'Failed to check rate limit');
        // Set default status if check fails
        setStatus({
          allowed: true,
          remaining: 5,
          resetTime: Date.now() + 60000,
          isBlocked: false,
          windowMs: 60000,
          maxRequests: 5,
          timeUntilReset: 60000,
          timeUntilUnblock: 0
        });
      }
    } catch (err) {
      console.error('Rate limit check error:', err);
      setError('Failed to check rate limit status');
      // Set default status on error
      setStatus({
        allowed: true,
        remaining: 5,
        resetTime: Date.now() + 60000,
        isBlocked: false,
        windowMs: 60000,
        maxRequests: 5,
        timeUntilReset: 60000,
        timeUntilUnblock: 0
      });
    } finally {
      setLoading(false);
    }
  }, [forcedUntil]);

  // Check rate limit on mount
  useEffect(() => {
    // First try to load persisted status for immediate display
    const hasPersistedStatus = loadPersistedStatus();
    
    // Always check rate limit from server, but with reduced loading if we have persisted status
    if (hasPersistedStatus) {
      setLoading(false); // Don't show loading since we have immediate status
    }
    checkRateLimit();
  }, [checkRateLimit, loadPersistedStatus]);

  // Auto-refresh rate limit status
  useEffect(() => {
    const currentStatus = forcedStatus || status;
    if (!currentStatus) return;

    // Don't auto-refresh if we have a forced status that hasn't expired
    if (forcedStatus && forcedUntil && Date.now() < forcedUntil) {
      return; // Let the forced status manage its own expiration
    }

    // Check more frequently when blocked or rate limited
    const isBlocked = currentStatus.isBlocked || !currentStatus.allowed;
    const baseInterval = isBlocked ? 10000 : 30000; // 10 seconds when blocked, 30 seconds normal
    
    const timeUntilNextCheck = Math.min(
      currentStatus.timeUntilReset,
      currentStatus.timeUntilUnblock || Infinity,
      baseInterval
    );

    if (timeUntilNextCheck > 0) {
      const timer = setTimeout(() => {
        checkRateLimit();
      }, timeUntilNextCheck);

      return () => clearTimeout(timer);
    }
  }, [status, forcedStatus, forcedUntil, checkRateLimit]);

  // Update timeUntilReset and timeUntilUnblock every 10 seconds
  useEffect(() => {
    const currentStatus = forcedStatus || status;
    if (!currentStatus) return;

    const interval = setInterval(() => {
      const now = Date.now();
      
      // Update forced status if it exists
      if (forcedStatus) {
        setForcedStatus(prev => {
          if (!prev) return prev;
          
          const newStatus = {
            ...prev,
            timeUntilReset: Math.max(0, prev.resetTime - now),
            timeUntilUnblock: prev.blockedUntil ? Math.max(0, prev.blockedUntil - now) : 0
          };
          
          // If time has expired, clear forced status
          if (newStatus.timeUntilReset <= 0 && newStatus.timeUntilUnblock <= 0) {
            setForcedStatus(null);
            setForcedUntil(null);
            // Clean up localStorage
            localStorage.removeItem('rate-limit-status');
            // Force a rate limit check to get fresh status
            checkRateLimit();
            return null;
          }
          
          return newStatus;
        });
      } else {
        // Update regular status
        setStatus(prev => {
          if (!prev) return prev;
          
          return {
            ...prev,
            timeUntilReset: Math.max(0, prev.resetTime - now),
            timeUntilUnblock: prev.blockedUntil ? Math.max(0, prev.blockedUntil - now) : 0
          };
        });
      }
    }, 10000); // Changed from 1000 to 10000 (10 seconds)

    return () => clearInterval(interval);
  }, [status, forcedStatus, checkRateLimit]);

  const formatTimeRemaining = useCallback((milliseconds: number): string => {
    if (milliseconds <= 0) return '0s';
    
    const seconds = Math.ceil(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      // If there are minutes, only show seconds if they're not 0
      if (remainingSeconds > 0) {
        return `${minutes}m ${remainingSeconds}s`;
      } else {
        return `${minutes}m`;
      }
    }
    return `${seconds}s`;
  }, []);

  const currentStatus = forcedStatus || status;
  const canSendMessage = currentStatus?.allowed && !currentStatus?.isBlocked;

  // Force set rate limit status when detected from server response
  const forceRateLimitStatus = useCallback((rateLimited: boolean, blocked: boolean, resetTimeSeconds?: number, blockTimeMinutes?: number) => {
    const now = Date.now();
    const resetTime = resetTimeSeconds ? now + (resetTimeSeconds * 1000) : now + 60000;
    const blockedUntil = blockTimeMinutes ? now + (blockTimeMinutes * 60 * 1000) : undefined;
    
    // Calculate when this forced status should expire
    const expiresAt = Math.max(resetTime, blockedUntil || 0);
    
    const forcedRateLimitStatus = {
      allowed: !rateLimited && !blocked,
      remaining: rateLimited || blocked ? 0 : 5,
      resetTime,
      isBlocked: blocked,
      blockedUntil,
      windowMs: 60000,
      maxRequests: 5,
      timeUntilReset: resetTime - now,
      timeUntilUnblock: blockedUntil ? blockedUntil - now : 0
    };
    
    setForcedStatus(forcedRateLimitStatus);
    setForcedUntil(expiresAt);
    
    // Persist to localStorage for immediate display on page reload
    persistStatus(forcedRateLimitStatus, expiresAt);
  }, [persistStatus]);

  return {
    status: currentStatus,
    loading,
    error,
    canSendMessage,
    checkRateLimit,
    formatTimeRemaining,
    forceRateLimitStatus
  };
} 