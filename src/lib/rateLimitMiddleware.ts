/**
 * Rate Limit Middleware for Next.js API Routes
 * Provides helper functions to apply rate limiting to any endpoint
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkRateLimitByConfig, RATE_LIMIT_CONFIG } from "@/lib/rateLimit";

/**
 * Get client identifier (user ID or IP address)
 * Prioritizes authenticated user ID, falls back to IP
 */
export async function getClientIdentifier(
  req: NextRequest
): Promise<string | number> {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user && "id" in session.user) {
      return parseInt((session.user as any).id);
    }
  } catch (err) {
    // Fall through to IP-based limiting
  }

  // Fall back to IP address
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  return ip;
}

/**
 * Rate limit enforcement for authenticated users
 */
export async function enforceRateLimit(
  req: NextRequest,
  configKey: keyof typeof RATE_LIMIT_CONFIG
): Promise<{ allowed: boolean; response?: NextResponse }> {
  const identifier = await getClientIdentifier(req);
  const result = checkRateLimitByConfig(identifier, configKey);

  if (!result.allowed) {
    const response = NextResponse.json(
      {
        error: "Too many requests",
        message: `Rate limit exceeded. Try again in ${Math.ceil((result.resetTime - Date.now()) / 1000)} seconds.`,
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
      },
      { status: 429 }
    );

    // Set rate limit headers
    response.headers.set("Retry-After", String(Math.ceil((result.resetTime - Date.now()) / 1000)));
    response.headers.set("X-RateLimit-Limit", String(RATE_LIMIT_CONFIG[configKey].maxRequests));
    response.headers.set("X-RateLimit-Remaining", "0");
    response.headers.set("X-RateLimit-Reset", String(result.resetTime));

    return { allowed: false, response };
  }

  return { allowed: true };
}

/**
 * Create a rate-limited route handler
 * @param handler - Your route handler function
 * @param configKey - Rate limit config key
 */
export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  configKey: keyof typeof RATE_LIMIT_CONFIG
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const { allowed, response: rateLimitResponse } = await enforceRateLimit(req, configKey);

    if (!allowed) {
      return rateLimitResponse!;
    }

    // Call the actual handler
    const response = await handler(req);

    // Add rate limit headers to response
    const identifier = await getClientIdentifier(req);
    const limitResult = checkRateLimitByConfig(identifier, configKey);
    const config = RATE_LIMIT_CONFIG[configKey];

    response.headers.set("X-RateLimit-Limit", String(config.maxRequests));
    response.headers.set("X-RateLimit-Remaining", String(limitResult.remaining));
    response.headers.set("X-RateLimit-Reset", String(limitResult.resetTime));

    return response;
  };
}

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  remaining: number,
  limit: number,
  resetTime: number
): NextResponse {
  response.headers.set("X-RateLimit-Limit", String(limit));
  response.headers.set("X-RateLimit-Remaining", String(remaining));
  response.headers.set("X-RateLimit-Reset", String(resetTime));
  return response;
}

/**
 * Check if identifier is rate limited (without incrementing)
 */
export async function isRateLimited(
  req: NextRequest,
  configKey: keyof typeof RATE_LIMIT_CONFIG
): Promise<boolean> {
  const identifier = await getClientIdentifier(req);
  const result = checkRateLimitByConfig(identifier, configKey);
  return !result.allowed;
}
