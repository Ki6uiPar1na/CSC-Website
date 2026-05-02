import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SolveModel } from "@/models/SolveModel";
import { ScoringModel } from "@/models/ScoringModel";
import { UserModel } from "@/models/UserModel";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";
import { withCache, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt((session.user as any).id);
    
    // Cache user-specific data with shorter TTL for real-time stats
    const [solves, moduleStatus, user, premiumRows] = await Promise.all([
      withCache(
        CACHE_KEYS.USER_SOLVES,
        () => SolveModel.getAllUserSolves(userId),
        CACHE_TTL.SHORT,
        { userId },
        userId
      ),
      withCache(
        CACHE_KEYS.USER_PROFILE,
        () => ScoringModel.getUserModuleStatus(userId),
        CACHE_TTL.MEDIUM,
        { userId },
        userId
      ),
      withCache(
        CACHE_KEYS.USER_STATS,
        () => UserModel.findByUsername(session?.user?.name!),
        CACHE_TTL.SHORT,
        { username: session?.user?.name },
        userId
      ),
      withCache(
        `${CACHE_KEYS.USER_PROFILE}:premium`,
        async () => {
          const [rows] = await pool.query<RowDataPacket[]>(
            `SELECT 1 FROM upgrade_code_usage u 
             JOIN upgrade_codes c ON u.upgrade_code_id = c.id 
             WHERE u.user_id = ? AND c.is_active = TRUE LIMIT 1`,
            [userId]
          );
          return rows.length > 0;
        },
        CACHE_TTL.SHORT,
        { userId },
        userId
      ),
    ]);

    const isPremium = premiumRows;

    return NextResponse.json({
      solves: solves.map(s => ({ solved_at: s.solved_at, challenge_id: s.challenge_id })),
      moduleStatus,
      totalPoints: user?.total_points || 0,
      streak: user?.current_streak || 0,
      isPremium: isPremium,
      subscription_expires_at: user?.subscription_expires_at || null
    });
  } catch (error: any) {
    console.error("Stats API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
