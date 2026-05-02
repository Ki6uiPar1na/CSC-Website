import { NextResponse, NextRequest } from "next/server";
import { UserModel } from "@/models/UserModel";
import { withCache, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";
import { enforceRateLimit } from "@/lib/rateLimitMiddleware";

export async function GET(req: NextRequest) {
  try {
    // Rate limiting (60 per minute)
    const { allowed, response: rateLimitResponse } = await enforceRateLimit(
      req,
      "GET_LEADERBOARD"
    );

    if (!allowed) {
      return rateLimitResponse!;
    }
    const leaderboard = await withCache(
      CACHE_KEYS.LEADERBOARD,
      () => UserModel.getLeaderboard(),
      CACHE_TTL.LONG // Leaderboard can be cached for longer as scores update less frequently
    );
    return NextResponse.json(leaderboard);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
