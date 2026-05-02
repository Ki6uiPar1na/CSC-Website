# Rate Limiting Documentation

## Overview

The website now has comprehensive **rate limiting** across all API endpoints to:
- Prevent brute-force attacks
- Protect against DDoS/spam
- Ensure fair resource usage
- Maintain service stability

## Quick Start

### Check Rate Limits

Every successful API response includes rate limit headers:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1714750000000
```

### Handle Rate Limit Errors

When rate limited, you'll receive HTTP 429:
```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Try again in 45 seconds.",
  "retryAfter": 45
}
```

## Rate Limit Tiers

### Tier 1: Strict (Critical Operations)
| Operation | Limit | Window |
|-----------|-------|--------|
| Register | 5 | 1 hour |
| Login | 10 | 15 min |
| Payment | 5 | 1 hour |
| Upgrade Account | 5 | 1 hour |

### Tier 2: Restricted (Submissions & Mutations)
| Operation | Limit | Window |
|-----------|-------|--------|
| Submit Challenge | 10 | 15 min |
| Create Challenge | 20 | 1 hour |
| Create Module | 20 | 1 hour |
| Create Event | 20 | 1 hour |
| Create Exam | 20 | 1 hour |
| Create Lesson | 50 | 1 hour |

### Tier 3: Moderate (Public API Reads)
| Operation | Limit | Window |
|-----------|-------|--------|
| Get Challenges | 60 | 1 min |
| Get Leaderboard | 60 | 1 min |
| Get Modules | 60 | 1 min |
| Get Lessons | 60 | 1 min |
| Get Events | 60 | 1 min |
| Get Exams | 60 | 1 min |
| Get Contests | 60 | 1 min |
| Get Achievements | 60 | 1 min |
| Get User Stats | 60 | 1 min |
| Get Resources | 60 | 1 min |
| Get Gallery | 60 | 1 min |
| Get Executives | 60 | 1 min |
| Get Alumni | 60 | 1 min |

### Tier 4: Light (Heavy Operations)
| Operation | Limit | Window |
|-----------|-------|--------|
| Search | 30 | 1 min |

## Identification Strategy

Rate limits are applied per:
1. **Authenticated Users** - By user ID (from JWT session)
2. **Unauthenticated Users** - By IP address

This ensures each user/IP has independent limits.

## Configuration

All rate limits are configured in `src/lib/rateLimit.ts`:

```typescript
export const RATE_LIMIT_CONFIG = {
  SUBMIT_CHALLENGE: { maxRequests: 10, windowMs: 15 * 60 * 1000 },
  GET_CHALLENGES: { maxRequests: 60, windowMs: 60 * 1000 },
  // ... more configurations
};
```

## Implementation

### For Endpoints

Adding rate limiting to an endpoint:

```typescript
import { enforceRateLimit } from "@/lib/rateLimitMiddleware";

export async function GET(req: NextRequest) {
  try {
    // Add rate limiting
    const { allowed, response: rateLimitResponse } = await enforceRateLimit(
      req,
      "GET_CHALLENGES"  // Use config key
    );

    if (!allowed) {
      return rateLimitResponse!;
    }

    // Your endpoint logic here
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### For Custom Limits

```typescript
import { checkRateLimitByConfig, getRateLimitKey } from "@/lib/rateLimit";

// Check custom limit
const result = checkRateLimitByConfig(userId, "SUBMIT_CHALLENGE");

if (!result.allowed) {
  return res.status(429).json({
    error: "Too many requests",
    retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
  });
}
```

### Utility Functions

```typescript
import { 
  checkRateLimit,
  checkRateLimitByConfig,
  getRateLimitStatus,
  resetRateLimit,
  resetUserRateLimits
} from "@/lib/rateLimit";

// Check if allowed
const result = checkRateLimitByConfig(userId, "SUBMIT_CHALLENGE");

// Get detailed status
const status = getRateLimitStatus(userId, "SUBMIT_CHALLENGE");
// Returns: { used, limit, remaining, resetTime, resetIn }

// Reset for user (admin action)
resetUserRateLimits(userId);

// Reset specific key (internal)
resetRateLimit(rateLimitKey);
```

## Headers

All responses include rate limit information:

```
X-RateLimit-Limit: 60          # Max requests allowed
X-RateLimit-Remaining: 45      # Requests remaining
X-RateLimit-Reset: 1714750000  # Unix timestamp when limit resets
Retry-After: 30                # (on 429) Seconds to wait
```

## Best Practices

### 1. Respect Rate Limits

Always check headers and respect rate limit windows:
```javascript
// Check remaining requests
const remaining = response.headers.get('X-RateLimit-Remaining');
if (remaining < 5) {
  console.warn('Approaching rate limit!');
}

// Handle 429 responses
if (response.status === 429) {
  const retryAfter = response.headers.get('Retry-After');
  console.log(`Wait ${retryAfter} seconds before retrying`);
}
```

### 2. Implement Exponential Backoff

```javascript
async function makeRequestWithRetry(endpoint, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(endpoint);
      
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
        const backoff = Math.pow(2, i) * retryAfter;
        console.log(`Waiting ${backoff}ms before retry`);
        await new Promise(resolve => setTimeout(resolve, backoff));
        continue;
      }
      
      return response;
    } catch (error) {
      // Handle errors
    }
  }
}
```

### 3. Batch Operations

Don't make repeated requests; batch when possible:
```javascript
// ❌ Bad: 10 individual requests
for (let i = 0; i < 10; i++) {
  const result = await fetch(`/api/challenges/${i}`);
}

// ✅ Good: Single batched request (if available)
const results = await fetch('/api/challenges?limit=10');
```

### 4. Cache Results Locally

Combine with the caching system:
```javascript
// Store results in client-side cache
const cachedData = localStorage.getItem('challenges');
if (cachedData && !isStale(cachedData)) {
  return JSON.parse(cachedData);
}

// Fetch and cache
const fresh = await fetch('/api/challenges');
localStorage.setItem('challenges', JSON.stringify(fresh), { maxAge: 5*60*1000 });
```

## Monitoring

### View Rate Limit Stats

```typescript
import { getRateLimitStats } from "@/lib/rateLimit";

const stats = getRateLimitStats();
// Returns: {
//   totalEntries: 1250,
//   activeCount: 892,
//   oldestEntry: 3599000,
//   newestEntry: 1000
// }
```

### Get User Status

```typescript
import { getRateLimitStatus } from "@/lib/rateLimit";

const status = getRateLimitStatus(userId, "SUBMIT_CHALLENGE");
console.log(`${status.used}/${status.limit} submissions used`);
console.log(`Try again in ${status.resetIn}`);
```

## Common Scenarios

### Scenario 1: Challenge Spam Prevention

User tries to submit 15 challenges in 10 minutes:
- Requests 1-10: ✅ Allowed
- Request 11: ❌ 429 - Rate limit exceeded
- After 15 minutes: ✅ Counter resets

### Scenario 2: Leaderboard Polling

Page checks leaderboard every second:
- Requests 1-60: ✅ Allowed (60/min)
- Request 61: ❌ 429 - Rate limited
- After 1 minute: ✅ Window resets

### Scenario 3: Multiple Users

100 users all making requests simultaneously:
- Each gets independent rate limit based on user ID
- No interference between users
- Fair resource allocation

## API Endpoints with Rate Limiting

✅ **All major endpoints now have rate limiting:**

Read Operations:
- `GET /api/challenges` - 60/min
- `GET /api/leaderboard` - 60/min
- `GET /api/modules` - 60/min
- `GET /api/lessons` - 60/min
- `GET /api/events` - 60/min
- `GET /api/exams` - 60/min
- `GET /api/contests` - 60/min
- `GET /api/achievements` - 60/min
- `GET /api/user/stats` - 60/min
- `GET /api/resources` - 60/min
- `GET /api/club-gallery` - 60/min
- `GET /api/executives` - 60/min
- `GET /api/alumni` - 60/min

Critical Operations:
- `POST /api/submit` - 10/15min
- `POST /api/register` - 5/hour
- `POST /api/login` - 10/15min
- `POST /api/payment` - 5/hour
- `POST /api/upgrade` - 5/hour

## Troubleshooting

### Issue: Getting 429 errors too frequently

**Solution**: Check the window and limit:
```javascript
const remaining = response.headers.get('X-RateLimit-Remaining');
const resetTime = parseInt(response.headers.get('X-RateLimit-Reset'));
const secondsToWait = Math.ceil((resetTime - Date.now()) / 1000);
```

### Issue: Different limits than expected

**Solution**: Verify configuration in `src/lib/rateLimit.ts` and check if using correct config key

### Issue: Rate limit not resetting

**Solution**: Limits auto-expire. If stuck:
- Wait for window to complete
- Contact admin to reset (admin only)

## Admin Commands

```typescript
import { resetUserRateLimits, resetRateLimit } from "@/lib/rateLimit";

// Reset all limits for user (admin action)
resetUserRateLimits(userId);

// Cleanup expired limits manually
import { cleanupRateLimits } from "@/lib/rateLimit";
const cleaned = cleanupRateLimits();
console.log(`Cleaned up ${cleaned} expired entries`);
```

## Performance Notes

- **Memory efficient**: Expired entries auto-cleanup every 30 minutes
- **Low overhead**: O(1) rate limit checks
- **Accurate**: Per-millisecond precision
- **Scalable**: Works with in-process storage (upgrade to Redis for multi-instance)

## Future Enhancements

- [ ] Redis backend for distributed rate limiting
- [ ] Sliding window algorithm
- [ ] Per-endpoint custom limits
- [ ] Gradual backoff penalties
- [ ] Rate limit analytics dashboard
- [ ] User-tier based limits
