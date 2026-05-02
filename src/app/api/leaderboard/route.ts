import { NextResponse } from "next/server";
import { UserModel } from "@/models/UserModel";
import { withCache, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";

export async function GET() {
  try {
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
