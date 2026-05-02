/**
 * Cache invalidation utilities for managing data freshness across endpoints
 * Call these when data is updated to ensure cache consistency
 */

import { cacheManager, CACHE_KEYS } from "@/lib/cache";

export const cacheInvalidators = {
  /**
   * Invalidate all user-related caches
   */
  invalidateUserCache: (userId?: number) => {
    if (userId) {
      cacheManager.invalidate(CACHE_KEYS.USER_STATS, { userId }, userId);
      cacheManager.invalidate(CACHE_KEYS.USER_SOLVES, { userId }, userId);
      cacheManager.invalidate(CACHE_KEYS.USER_PROFILE, { userId }, userId);
      cacheManager.invalidate(CACHE_KEYS.USER_ACHIEVEMENTS, { userId }, userId);
      cacheManager.invalidate(`${CACHE_KEYS.USER_PROFILE}:premium`, { userId }, userId);
      cacheManager.invalidate(`${CACHE_KEYS.USER_PROFILE}:events`, { userId }, userId);
      cacheManager.invalidate(`${CACHE_KEYS.USER_PROFILE}:exams`, { userId }, userId);
    }
  },

  /**
   * Invalidate all challenge-related caches
   */
  invalidateChallengesCache: () => {
    cacheManager.invalidateNamespace(CACHE_KEYS.CHALLENGES);
    cacheManager.invalidateNamespace(CACHE_KEYS.CHALLENGE_DETAIL);
    cacheManager.invalidateNamespace(CACHE_KEYS.CHALLENGES_BY_MODULE);
  },

  /**
   * Invalidate leaderboard cache
   */
  invalidateLeaderboard: () => {
    cacheManager.invalidateNamespace(CACHE_KEYS.LEADERBOARD);
    cacheManager.invalidateNamespace(CACHE_KEYS.LEADERBOARD_USER_RANK);
  },

  /**
   * Invalidate module/lesson caches
   */
  invalidateModulesCache: () => {
    cacheManager.invalidateNamespace(CACHE_KEYS.MODULES);
    cacheManager.invalidateNamespace(CACHE_KEYS.MODULE_DETAIL);
    cacheManager.invalidateNamespace(CACHE_KEYS.LESSONS);
    cacheManager.invalidateNamespace(CACHE_KEYS.LESSON_DETAIL);
  },

  /**
   * Invalidate achievement caches
   */
  invalidateAchievementsCache: () => {
    cacheManager.invalidateNamespace(CACHE_KEYS.ACHIEVEMENTS);
    cacheManager.invalidateNamespace(CACHE_KEYS.CLUB_ACHIEVEMENTS);
  },

  /**
   * Invalidate event/contest/exam caches
   */
  invalidateEventsCache: () => {
    cacheManager.invalidateNamespace(CACHE_KEYS.EVENTS);
    cacheManager.invalidateNamespace(CACHE_KEYS.EVENT_DETAIL);
  },

  invalidateContestsCache: () => {
    cacheManager.invalidateNamespace(CACHE_KEYS.CONTESTS);
  },

  invalidateExamsCache: () => {
    cacheManager.invalidateNamespace(CACHE_KEYS.EXAMS);
  },

  /**
   * Invalidate gallery/resource caches
   */
  invalidateGalleryCache: () => {
    cacheManager.invalidateNamespace(CACHE_KEYS.GALLERY);
  },

  invalidateResourcesCache: () => {
    cacheManager.invalidateNamespace(CACHE_KEYS.RESOURCES);
  },

  /**
   * Invalidate people caches (executives, alumni)
   */
  invalidateExecutivesCache: () => {
    cacheManager.invalidateNamespace(CACHE_KEYS.EXECUTIVES);
  },

  invalidateAlumniCache: () => {
    cacheManager.invalidateNamespace(CACHE_KEYS.ALUMNI);
  },

  /**
   * Invalidate all caches - useful for admin operations
   */
  invalidateAll: () => {
    cacheManager.clear();
  },
};
