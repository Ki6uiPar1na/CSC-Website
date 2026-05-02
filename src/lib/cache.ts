/**
 * In-memory cache system for storing database queries
 * Improves performance by reducing database hits
 * Cache keys include user context to ensure data isolation
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class CacheManager {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Generate cache key with optional user context
   */
  private generateKey(namespace: string, params?: any, userId?: number | null): string {
    let key = namespace;
    if (params) {
      key += `:${JSON.stringify(params)}`;
    }
    if (userId) {
      key += `:user:${userId}`;
    }
    return key;
  }

  /**
   * Set cache entry
   * @param namespace - Cache namespace (e.g., 'challenges', 'leaderboard')
   * @param data - Data to cache
   * @param ttl - Time to live in seconds
   * @param params - Optional parameters for key generation
   * @param userId - Optional user ID for user-specific caching
   */
  set<T>(
    namespace: string,
    data: T,
    ttl: number = 300, // 5 minutes default
    params?: any,
    userId?: number | null
  ): void {
    const key = this.generateKey(namespace, params, userId);
    const ttlMs = ttl * 1000;

    // Clear existing timer if any
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    });

    // Auto-expire cache entry
    const timer = setTimeout(() => {
      this.cache.delete(key);
      this.timers.delete(key);
    }, ttlMs);

    this.timers.set(key, timer);
  }

  /**
   * Get cache entry if not expired
   */
  get<T>(namespace: string, params?: any, userId?: number | null): T | null {
    const key = this.generateKey(namespace, params, userId);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      if (this.timers.has(key)) {
        clearTimeout(this.timers.get(key));
        this.timers.delete(key);
      }
      return null;
    }

    return entry.data as T;
  }

  /**
   * Check if cache entry exists and is valid
   */
  has(namespace: string, params?: any, userId?: number | null): boolean {
    const key = this.generateKey(namespace, params, userId);
    return this.get(namespace, params, userId) !== null;
  }

  /**
   * Invalidate cache entry
   */
  invalidate(namespace: string, params?: any, userId?: number | null): void {
    const key = this.generateKey(namespace, params, userId);
    this.cache.delete(key);
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
  }

  /**
   * Invalidate all entries for a namespace
   */
  invalidateNamespace(namespace: string): void {
    const prefix = namespace + ":";
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix) || key === namespace) {
        this.cache.delete(key);
        if (this.timers.has(key)) {
          clearTimeout(this.timers.get(key));
          this.timers.delete(key);
        }
      }
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.cache.clear();
    this.timers.clear();
  }

  /**
   * Get cache statistics for debugging
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Export singleton instance
export const cacheManager = new CacheManager();

/**
 * Cache strategy wrapper for data fetching
 * Fetches from cache if available, otherwise calls the provided function
 */
export async function withCache<T>(
  namespace: string,
  fetcher: () => Promise<T>,
  ttl: number = 300,
  params?: any,
  userId?: number | null
): Promise<T> {
  // Check cache first
  const cached = cacheManager.get<T>(namespace, params, userId);
  if (cached !== null) {
    return cached;
  }

  // Fetch data
  const data = await fetcher();

  // Store in cache
  cacheManager.set(namespace, data, ttl, params, userId);

  return data;
}

/**
 * Cache namespaces and their default TTLs (in seconds)
 */
export const CACHE_KEYS = {
  // User data - shorter TTL for real-time updates
  USER_STATS: "user:stats",
  USER_PROFILE: "user:profile",
  USER_ACHIEVEMENTS: "user:achievements",
  USER_SOLVES: "user:solves",

  // Challenge data - moderate TTL
  CHALLENGES: "challenges:list",
  CHALLENGE_DETAIL: "challenge:detail",
  CHALLENGES_BY_MODULE: "challenges:byModule",

  // Leaderboard - longer TTL as it updates less frequently
  LEADERBOARD: "leaderboard:top",
  LEADERBOARD_USER_RANK: "leaderboard:userRank",

  // Module/Lesson data - longer TTL
  MODULES: "modules:list",
  MODULE_DETAIL: "module:detail",
  LESSONS: "lessons:list",
  LESSON_DETAIL: "lesson:detail",

  // Achievement data
  ACHIEVEMENTS: "achievements:list",
  CLUB_ACHIEVEMENTS: "clubAchievements:list",

  // Other data
  EXECUTIVES: "executives:list",
  ALUMNI: "alumni:list",
  EVENTS: "events:list",
  EVENT_DETAIL: "event:detail",
  RESOURCES: "resources:list",
  EXAMS: "exams:list",
  CONTESTS: "contests:list",
  GALLERY: "gallery:list",

  // Admin data
  ADMIN_USERS: "admin:users",
  ADMIN_CHALLENGES: "admin:challenges",
  ADMIN_SETTINGS: "admin:settings",
};

export const CACHE_TTL = {
  SHORT: 60, // 1 minute - for real-time stats
  MEDIUM: 300, // 5 minutes - for frequently changing data
  LONG: 900, // 15 minutes - for less frequently changing data
  VERY_LONG: 3600, // 1 hour - for static data
};
