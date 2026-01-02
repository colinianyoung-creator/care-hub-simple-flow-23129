/**
 * Client-side rate limiting utility
 * Uses localStorage as a fallback/UX enhancement
 * Server-side rate limiting is authoritative
 */

interface RateLimitEntry {
  attempts: number[];
}

const STORAGE_KEY = 'rate_limits';

function getStoredLimits(): Record<string, RateLimitEntry> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function setStoredLimits(limits: Record<string, RateLimitEntry>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(limits));
  } catch {
    // localStorage might be unavailable
  }
}

function getKey(action: string, identifier: string): string {
  return `${action}:${identifier}`;
}

function cleanOldAttempts(attempts: number[], windowMs: number): number[] {
  const cutoff = Date.now() - windowMs;
  return attempts.filter(timestamp => timestamp > cutoff);
}

/**
 * Check if an action is allowed based on client-side rate limiting
 */
export function checkClientRateLimit(
  action: string,
  identifier: string,
  maxAttempts: number,
  windowMs: number
): boolean {
  const limits = getStoredLimits();
  const key = getKey(action, identifier);
  const entry = limits[key];
  
  if (!entry) return true;
  
  const recentAttempts = cleanOldAttempts(entry.attempts, windowMs);
  return recentAttempts.length < maxAttempts;
}

/**
 * Record an attempt for client-side rate limiting
 */
export function recordClientAttempt(action: string, identifier: string): void {
  const limits = getStoredLimits();
  const key = getKey(action, identifier);
  
  if (!limits[key]) {
    limits[key] = { attempts: [] };
  }
  
  limits[key].attempts.push(Date.now());
  
  // Keep only last 100 attempts to prevent localStorage bloat
  if (limits[key].attempts.length > 100) {
    limits[key].attempts = limits[key].attempts.slice(-100);
  }
  
  setStoredLimits(limits);
}

/**
 * Clear attempts after a successful action (optional)
 */
export function clearClientAttempts(action: string, identifier: string): void {
  const limits = getStoredLimits();
  const key = getKey(action, identifier);
  delete limits[key];
  setStoredLimits(limits);
}

/**
 * Get remaining attempts before rate limit is hit
 */
export function getRemainingAttempts(
  action: string,
  identifier: string,
  maxAttempts: number,
  windowMs: number
): number {
  const limits = getStoredLimits();
  const key = getKey(action, identifier);
  const entry = limits[key];
  
  if (!entry) return maxAttempts;
  
  const recentAttempts = cleanOldAttempts(entry.attempts, windowMs);
  return Math.max(0, maxAttempts - recentAttempts.length);
}

/**
 * Get time in milliseconds until the rate limit resets
 */
export function getTimeUntilReset(
  action: string,
  identifier: string,
  windowMs: number
): number {
  const limits = getStoredLimits();
  const key = getKey(action, identifier);
  const entry = limits[key];
  
  if (!entry || entry.attempts.length === 0) return 0;
  
  const oldestRecentAttempt = Math.min(...cleanOldAttempts(entry.attempts, windowMs));
  if (!oldestRecentAttempt) return 0;
  
  const resetTime = oldestRecentAttempt + windowMs;
  return Math.max(0, resetTime - Date.now());
}

/**
 * Format remaining time for display
 */
export function formatTimeRemaining(ms: number): string {
  const seconds = Math.ceil(ms / 1000);
  if (seconds < 60) return `${seconds} seconds`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes > 1 ? 's' : ''}`;
}

// Rate limit configurations
export const RATE_LIMITS = {
  login: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  passwordReset: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 60 minutes
  },
  inviteRedeem: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
} as const;
