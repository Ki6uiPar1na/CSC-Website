# Caching Strategy Documentation

## Overview

The website now implements a comprehensive **in-memory caching layer** to reduce database queries and improve performance. This document explains the caching system, how to use it, and best practices.

## Quick Start

### Using Cache in Endpoints

```typescript
import { withCache, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";

// Simple caching
const data = await withCache(
  CACHE_KEYS.CHALLENGES,
  async () => {
    // This function is only called if cache miss occurs
    const [results] = await pool.query("SELECT * FROM challenges");
    return results;
  },
  CACHE_TTL.MEDIUM // Cache for 5 minutes
);
```

### With User Context

```typescript
// Cache per user (isolated cache entries for each user)
const userStats = await withCache(
  CACHE_KEYS.USER_STATS,
  async () => {
    const user = await UserModel.findByUsername(username);
    return user;
  },
  CACHE_TTL.SHORT,
  { username }, // Parameters for cache key
  userId        // User ID for user-specific caching
);
```

### Invalidating Cache

```typescript
import { cacheInvalidators } from "@/lib/cacheInvalidators";

// After a user solves a challenge
cacheInvalidators.invalidateUserCache(userId);
cacheInvalidators.invalidateChallengesCache();
cacheInvalidators.invalidateLeaderboard();

// Or invalidate all caches (for admin operations)
cacheInvalidators.invalidateAll();
```

## Cache Architecture

### Three-Tier Cache System

1. **Cache Manager** (`src/lib/cache.ts`)
   - Core caching engine with automatic TTL expiration
   - Manages cache entries and their lifecycle
   - Supports invalidation by namespace or specific key

2. **Cache Wrapper** (`withCache` function)
   - High-level API for fetching with automatic caching
   - Handles cache hits/misses transparently
   - Supports user-specific caching

3. **Cache Invalidators** (`src/lib/cacheInvalidators.ts`)
   - Helper functions to invalidate specific cache domains
   - Used after data mutations
   - Organized by feature (users, challenges, events, etc.)

### TTL Tiers

| Tier | Duration | Use Case |
|------|----------|----------|
| SHORT | 60s (1 min) | Real-time data (user stats, premium status) |
| MEDIUM | 300s (5 min) | Frequently changing data (challenges, events) |
| LONG | 900s (15 min) | Less frequent updates (modules, lessons) |
| VERY_LONG | 3600s (1 hour) | Static data (resources, executives, alumni) |

## Cached Endpoints

### User Data
- **`GET /api/user/stats`** - User profile, solves, achievements (SHORT)
- **`GET /api/achievements`** - User achievements (MEDIUM)

### Challenges & Learning
- **`GET /api/challenges`** - Challenge listings (MEDIUM)
- **`GET /api/modules`** - Module listings (LONG)
- **`GET /api/lessons`** - Lesson content (LONG)

### Social & Competitive
- **`GET /api/leaderboard`** - Top rankings (LONG)
- **`GET /api/events`** - Event listings (MEDIUM)
- **`GET /api/contests`** - Contest listings (LONG)

### Content & Gallery
- **`GET /api/resources`** - Learning resources (VERY_LONG)
- **`GET /api/club-gallery`** - Gallery images (VERY_LONG)
- **`GET /api/club-achievements`** - Club achievements (VERY_LONG)

### Organization
- **`GET /api/executives`** - Executive team (VERY_LONG)
- **`GET /api/alumni`** - Alumni list (VERY_LONG)

### Assessments
- **`GET /api/exams`** - Exam data (LONG)

## Cache Key Reference

```typescript
CACHE_KEYS = {
  USER_STATS: "user:stats",
  USER_PROFILE: "user:profile",
  USER_ACHIEVEMENTS: "user:achievements",
  USER_SOLVES: "user:solves",
  
  CHALLENGES: "challenges:list",
  CHALLENGE_DETAIL: "challenge:detail",
  CHALLENGES_BY_MODULE: "challenges:byModule",
  
  LEADERBOARD: "leaderboard:top",
  LEADERBOARD_USER_RANK: "leaderboard:userRank",
  
  MODULES: "modules:list",
  MODULE_DETAIL: "module:detail",
  LESSONS: "lessons:list",
  LESSON_DETAIL: "lesson:detail",
  
  ACHIEVEMENTS: "achievements:list",
  CLUB_ACHIEVEMENTS: "clubAchievements:list",
  
  EXECUTIVES: "executives:list",
  ALUMNI: "alumni:list",
  EVENTS: "events:list",
  EVENT_DETAIL: "event:detail",
  RESOURCES: "resources:list",
  EXAMS: "exams:list",
  CONTESTS: "contests:list",
  GALLERY: "gallery:list",
  
  ADMIN_USERS: "admin:users",
  ADMIN_CHALLENGES: "admin:challenges",
  ADMIN_SETTINGS: "admin:settings",
}
```

## Auto Cache Invalidation

When data is modified, caches are automatically invalidated in the following scenarios:

### Challenge Submissions
When a user solves a challenge (`POST /api/submit`):
- ✅ Challenges cache cleared
- ✅ User solves invalidated
- ✅ User stats invalidated
- ✅ Leaderboard invalidated
- ✅ User achievements invalidated

### New Data Creation
When creating new items:
- ✅ `POST /api/executives` → Invalidates executives cache
- ✅ `POST /api/alumni` → Invalidates alumni cache
- ✅ `POST /api/contests` → Invalidates contests cache
- ✅ `POST /api/club-achievements` → Invalidates club achievements cache

## Best Practices

### 1. Choose Appropriate TTL
```typescript
// ✅ Good: Real-time user stats with SHORT TTL
const stats = await withCache(
  CACHE_KEYS.USER_STATS,
  fetchUserStats,
  CACHE_TTL.SHORT, // 1 minute
  { userId },
  userId
);

// ✅ Good: Static resources with VERY_LONG TTL
const resources = await withCache(
  CACHE_KEYS.RESOURCES,
  fetchResources,
  CACHE_TTL.VERY_LONG // 1 hour
);
```

### 2. Include User Context for User-Specific Data
```typescript
// ✅ Good: Each user gets isolated cache
const userStats = await withCache(
  CACHE_KEYS.USER_STATS,
  () => fetchStats(userId),
  CACHE_TTL.SHORT,
  { userId },
  userId // Include userId as 3rd parameter
);

// ❌ Bad: User A sees User B's cached data!
const userStats = await withCache(
  CACHE_KEYS.USER_STATS,
  () => fetchStats(userId),
  CACHE_TTL.SHORT
  // Missing userId parameter
);
```

### 3. Use Specific Invalidators
```typescript
// ✅ Good: Invalidate only what changed
if (challengeSolved) {
  cacheInvalidators.invalidateChallengesCache();
  cacheInvalidators.invalidateUserCache(userId);
  cacheInvalidators.invalidateLeaderboard();
}

// ❌ Bad: Performance hit from clearing everything
cacheInvalidators.invalidateAll();
```

### 4. Include Relevant Parameters
```typescript
// ✅ Good: Unique cache key per module
const lessons = await withCache(
  CACHE_KEYS.LESSONS,
  () => fetchLessons(moduleId),
  CACHE_TTL.LONG,
  { moduleId } // Include in params
);

// ❌ Bad: All modules share same cache
const lessons = await withCache(
  CACHE_KEYS.LESSONS,
  () => fetchLessons(moduleId),
  CACHE_TTL.LONG
);
```

## Monitoring Cache Performance

### Viewing Cache Statistics
```typescript
import { cacheManager } from "@/lib/cache";

// Get cache stats for debugging
const stats = cacheManager.getStats();
console.log("Cache size:", stats.size);
console.log("Cached keys:", stats.keys);
```

### Performance Metrics
- Expected DB query reduction: **60-80%** for public pages
- Especially effective for leaderboard, modules, lessons
- User-specific data has good cache hit rates due to consistent access patterns

## Cache Debugging

### Testing Cache Behavior
```typescript
// Clear all cache for testing
cacheManager.clear();

// Make request - should hit DB
const data1 = await fetch("/api/challenges");

// Make same request - should hit cache
const data2 = await fetch("/api/challenges");

// Invalidate manually
cacheInvalidators.invalidateChallengesCache();

// Next request hits DB again
const data3 = await fetch("/api/challenges");
```

## Migration from Non-Cached Endpoints

When adding caching to an existing endpoint:

1. **Identify cache key** in `CACHE_KEYS`
2. **Choose TTL tier** based on update frequency
3. **Include parameters** that affect the query
4. **Add invalidation** to related mutation endpoints
5. **Test cache** by hitting endpoint twice

Example:
```typescript
// Before
export async function GET() {
  const [data] = await pool.query("SELECT * FROM modules");
  return NextResponse.json(data);
}

// After
export async function GET() {
  const data = await withCache(
    CACHE_KEYS.MODULES,
    async () => {
      const [result] = await pool.query("SELECT * FROM modules");
      return result;
    },
    CACHE_TTL.LONG
  );
  return NextResponse.json(data);
}
```

## Important Notes

- Cache is **in-process memory** - survives until server restart
- **No persistence** between deployments
- **Not distributed** - each server instance has its own cache
- **Thread-safe** for Node.js single-threaded model
- Best for read-heavy operations
- User-specific data properly isolated per user

## Future Enhancements

- Consider Redis for distributed caching
- Add cache hit/miss metrics
- Implement cache warming for popular queries
- Add real-time cache invalidation via WebSockets
