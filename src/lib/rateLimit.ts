const rateLimits = new Map<string, { count: number; resetTime: number }>();

/**
 * Rate Limit Configuration by Endpoint
 * Format: { maxRequests, windowMs (milliseconds) }
 */
export const RATE_LIMIT_CONFIG = {
  // Authentication & User Management
  REGISTER: { maxRequests: 5, windowMs: 60 * 60 * 1000 }, // 5 per hour
  LOGIN: { maxRequests: 10, windowMs: 15 * 60 * 1000 }, // 10 per 15 min
  
  // Challenge Submissions (Critical - strict limits)
  SUBMIT_CHALLENGE: { maxRequests: 10, windowMs: 15 * 60 * 1000 }, // 10 per 15 min
  
  // API Read Operations (Generous - public data)
  GET_CHALLENGES: { maxRequests: 60, windowMs: 60 * 1000 }, // 60 per minute
  GET_LEADERBOARD: { maxRequests: 60, windowMs: 60 * 1000 }, // 60 per minute
  GET_MODULES: { maxRequests: 60, windowMs: 60 * 1000 }, // 60 per minute
  GET_LESSONS: { maxRequests: 60, windowMs: 60 * 1000 }, // 60 per minute
  GET_EVENTS: { maxRequests: 60, windowMs: 60 * 1000 }, // 60 per minute
  GET_EXAMS: { maxRequests: 60, windowMs: 60 * 1000 }, // 60 per minute
  GET_CONTESTS: { maxRequests: 60, windowMs: 60 * 1000 }, // 60 per minute
  GET_ACHIEVEMENTS: { maxRequests: 60, windowMs: 60 * 1000 }, // 60 per minute
  GET_USER_STATS: { maxRequests: 60, windowMs: 60 * 1000 }, // 60 per minute
  GET_RESOURCES: { maxRequests: 60, windowMs: 60 * 1000 }, // 60 per minute
  GET_GALLERY: { maxRequests: 60, windowMs: 60 * 1000 }, // 60 per minute
  GET_EXECUTIVES: { maxRequests: 60, windowMs: 60 * 1000 }, // 60 per minute
  GET_ALUMNI: { maxRequests: 60, windowMs: 60 * 1000 }, // 60 per minute
  GET_SEARCH: { maxRequests: 30, windowMs: 60 * 1000 }, // 30 per minute (heavy operation)
  
  // Write Operations (Moderate - account creation, payments)
  CREATE_CHALLENGE: { maxRequests: 20, windowMs: 60 * 60 * 1000 }, // 20 per hour
  CREATE_MODULE: { maxRequests: 20, windowMs: 60 * 60 * 1000 }, // 20 per hour
  CREATE_EVENT: { maxRequests: 20, windowMs: 60 * 60 * 1000 }, // 20 per hour
  CREATE_EXAM: { maxRequests: 20, windowMs: 60 * 60 * 1000 }, // 20 per hour
  CREATE_LESSON: { maxRequests: 50, windowMs: 60 * 60 * 1000 }, // 50 per hour
  
  // Payment & Upgrades (Very strict)
  PAYMENT: { maxRequests: 5, windowMs: 60 * 60 * 1000 }, // 5 per hour
  UPGRADE: { maxRequests: 5, windowMs: 60 * 60 * 1000 }, // 5 per hour
  
  // Event RSVP
  RSVP_EVENT: { maxRequests: 20, windowMs: 60 * 60 * 1000 }, // 20 per hour
  
  // Search
  SEARCH: { maxRequests: 30, windowMs: 60 * 1000 }, // 30 per minute
  
  // Admin Operations
  ADMIN_CREATE: { maxRequests: 100, windowMs: 60 * 60 * 1000 }, // 100 per hour
  ADMIN_UPDATE: { maxRequests: 100, windowMs: 60 * 60 * 1000 }, // 100 per hour
  ADMIN_DELETE: { maxRequests: 50, windowMs: 60 * 60 * 1000 }, // 50 per hour
};

const DEFAULT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const DEFAULT_MAX_REQUESTS = 10;

/**
 * Generate rate limit key
 * @param identifier - Can be userId, IP address, or custom identifier
 * @param actionType - Type of action (SUBMIT_CHALLENGE, LOGIN, etc.)
 * @returns Unique rate limit key
 */
export function getRateLimitKey(identifier: string | number, actionType: string): string {
  return `${actionType}:${identifier}`;
}

/**
 * Check if request is within rate limit
 * @param key - Rate limit key
 * @param maxRequests - Max requests allowed
 * @param windowMs - Time window in milliseconds
 * @returns { allowed, remaining, resetTime }
 */
export function checkRateLimit(
  key: string,
  maxRequests: number = DEFAULT_MAX_REQUESTS,
  windowMs: number = DEFAULT_WINDOW_MS
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const limit = rateLimits.get(key);

  if (!limit || now > limit.resetTime) {
    // New window
    rateLimits.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return { allowed: true, remaining: maxRequests - 1, resetTime: now + windowMs };
  }

  if (limit.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetTime: limit.resetTime };
  }

  limit.count++;
  return { allowed: true, remaining: maxRequests - limit.count, resetTime: limit.resetTime };
}

/**
 * Check rate limit with predefined config
 * @param identifier - User ID or IP
 * @param configKey - Key from RATE_LIMIT_CONFIG
 * @returns Rate limit check result
 */
export function checkRateLimitByConfig(
  identifier: string | number,
  configKey: keyof typeof RATE_LIMIT_CONFIG
): { allowed: boolean; remaining: number; resetTime: number } {
  const config = RATE_LIMIT_CONFIG[configKey];
  if (!config) {
    throw new Error(`Unknown rate limit config: ${configKey}`);
  }

  const key = getRateLimitKey(identifier, configKey);
  return checkRateLimit(key, config.maxRequests, config.windowMs);
}

/**
 * Increment rate limit without checking (for manual tracking)
 */
export function incrementRateLimit(
  key: string,
  windowMs: number = DEFAULT_WINDOW_MS
): void {
  const now = Date.now();
  const limit = rateLimits.get(key);

  if (!limit || now > limit.resetTime) {
    rateLimits.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
  } else {
    limit.count++;
  }
}

/**
 * Reset rate limit for a specific key
 */
export function resetRateLimit(key: string): void {
  rateLimits.delete(key);
}

/**
 * Reset all rate limits for a user
 */
export function resetUserRateLimits(userId: number): void {
  for (const key of rateLimits.keys()) {
    if (key.includes(`:${userId}`)) {
      rateLimits.delete(key);
    }
  }
}

/**
 * Get rate limit status
 */
export function getRateLimitStatus(
  identifier: string | number,
  configKey: keyof typeof RATE_LIMIT_CONFIG
): { 
  used: number; 
  limit: number; 
  remaining: number;
  resetTime: number;
  resetIn: string;
} {
  const config = RATE_LIMIT_CONFIG[configKey];
  const key = getRateLimitKey(identifier, configKey);
  const limit = rateLimits.get(key);
  const now = Date.now();

  let used = 0;
  let resetTime = now + config.windowMs;

  if (limit && now <= limit.resetTime) {
    used = limit.count;
    resetTime = limit.resetTime;
  }

  const resetIn = formatTimeRemaining(resetTime - now);

  return {
    used,
    limit: config.maxRequests,
    remaining: Math.max(0, config.maxRequests - used),
    resetTime,
    resetIn,
  };
}

/**
 * Format time remaining (ms to human-readable)
 */
function formatTimeRemaining(ms: number): string {
  if (ms < 1000) return `${Math.ceil(ms / 1000)}s`;
  if (ms < 60000) return `${Math.ceil(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.ceil(ms / 60000)}m`;
  return `${Math.ceil(ms / 3600000)}h`;
}

/**
 * Cleanup old entries (run periodically)
 * Removes expired rate limit entries to free memory
 */
export function cleanupRateLimits(): number {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [key, limit] of rateLimits.entries()) {
    if (now > limit.resetTime) {
      rateLimits.delete(key);
      cleaned++;
    }
  }
  
  return cleaned;
}

/**
 * Get rate limit stats (for monitoring)
 */
export function getRateLimitStats(): {
  totalEntries: number;
  activeLimits: number;
  oldestEntry: number;
  newestEntry: number;
} {
  const now = Date.now();
  let activeLimits = 0;
  let oldest = Infinity;
  let newest = 0;

  for (const [, limit] of rateLimits.entries()) {
    if (now <= limit.resetTime) {
      activeLimits++;
    }
    oldest = Math.min(oldest, limit.resetTime);
    newest = Math.max(newest, limit.resetTime);
  }

  return {
    totalEntries: rateLimits.size,
    activeLimits,
    oldestEntry: oldest === Infinity ? 0 : oldest - now,
    newestEntry: newest - now,
  };
}

// Run cleanup every 30 minutes
setInterval(cleanupRateLimits, 30 * 60 * 1000);
