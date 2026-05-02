import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AchievementModel } from "@/models/AchievementModel";
import { withCache, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";
import { enforceRateLimit } from "@/lib/rateLimitMiddleware";

export async function GET(req: NextRequest) {
  try {
    // Rate limiting (60 per minute)
    const { allowed, response: rateLimitResponse } = await enforceRateLimit(
      req,
      "GET_ACHIEVEMENTS"
    );

    if (!allowed) {
      return rateLimitResponse!;
    }
    const session = await getServerSession(authOptions);
    if (!session?.user || !("id" in session.user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt((session.user as any).id);
    const achievements = await withCache(
      CACHE_KEYS.USER_ACHIEVEMENTS,
      () => AchievementModel.getUserAchievements(userId),
      CACHE_TTL.MEDIUM,
      { userId },
      userId
    );

    return NextResponse.json(achievements);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
