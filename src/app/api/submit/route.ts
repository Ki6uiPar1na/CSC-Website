import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/models/db";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import { checkFlag } from "@/lib/flagUtils";
import { cacheManager, CACHE_KEYS } from "@/lib/cache";
import { enforceRateLimit } from "@/lib/rateLimitMiddleware";

export async function POST(req: NextRequest) {
  try {
    // Rate limiting for challenge submissions (10 per 15 minutes)
    const { allowed, response: rateLimitResponse } = await enforceRateLimit(
      req,
      "SUBMIT_CHALLENGE"
    );

    if (!allowed) {
      return rateLimitResponse!;
    }

    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = "id" in session.user ? parseInt((session.user as any).id) : null;
    const body = await req.json();
    const { challengeId, flag } = body;

    if (!challengeId || !flag) return NextResponse.json({ error: "Challenge and flag required" }, { status: 400 });

    // 1. Get challenge details, flags (with COALESCE), and check prerequisite
    const [challenges]: any = await pool.query<RowDataPacket[]>(
      `SELECT c.*, 
              COALESCE(
                (SELECT JSON_ARRAYAGG(JSON_OBJECT('flag', cf.flag, 'is_case_insensitive', cf.is_case_insensitive, 'allow_variations', cf.allow_variations)) 
                 FROM challenge_flags cf WHERE cf.challenge_id = c.id),
                JSON_ARRAY()
              ) as allowed_flags
       FROM challenges c WHERE c.id = ?`,
      [challengeId]
    );

    if (challenges.length === 0) return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    const challenge = challenges[0];

    // Check premium access
    if (challenge.is_premium) {
      const userRole = (session.user as any).role;
      const isAdmin = userRole === 1;
      
      const [premiumRows] = await pool.query<RowDataPacket[]>(
        `SELECT 1 FROM upgrade_code_usage u 
         JOIN upgrade_codes c ON u.upgrade_code_id = c.id 
         WHERE u.user_id = ? AND c.is_active = TRUE LIMIT 1`,
        [userId]
      );
      const isPremium = premiumRows.length > 0;

      if (!isAdmin && !isPremium) {
        return NextResponse.json({ error: "Premium membership required" }, { status: 403 });
      }
    }

    // Check prerequisite
    if (challenge.prerequisite_id) {
      const [prereq]: any = await pool.query("SELECT 1 FROM solves WHERE user_id = ? AND challenge_id = ?", [userId, challenge.prerequisite_id]);
      if (prereq.length === 0) return NextResponse.json({ error: "Prerequisite not solved" }, { status: 403 });
    }

    // Check if already solved
    const [existing]: any = await pool.query("SELECT 1 FROM solves WHERE user_id = ? AND challenge_id = ?", [userId, challengeId]);
    if (existing.length > 0) return NextResponse.json({ error: "Already solved" }, { status: 400 });

    // 2. Verify Flag
    const isCorrect = await checkFlag(flag, challenge.allowed_flags || []);
    if (!isCorrect) {
      await pool.query("INSERT INTO submissions (user_id, task_id, submitted_flag, is_correct) VALUES (?, ?, ?, ?)", [userId, challengeId, flag, false]);
      return NextResponse.json({ error: "Incorrect flag" }, { status: 400 });
    }

    // 3. Calculate dynamic points
    let pointsAwarded = challenge.max_points;
    if (challenge.solve_count > 0 && challenge.decay_limit > 0) {
      const reduction = Math.floor((challenge.max_points - challenge.min_points) * Math.min(challenge.solve_count / challenge.decay_limit, 1));
      pointsAwarded = Math.max(challenge.max_points - reduction, challenge.min_points);
    }

    // 4. Record solve
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query("INSERT INTO solves (user_id, challenge_id, points_awarded) VALUES (?, ?, ?)", [userId, challengeId, pointsAwarded]);
      await connection.query("UPDATE challenges SET solve_count = solve_count + 1, current_points = ? WHERE id = ?", [pointsAwarded, challengeId]);
      await connection.query("UPDATE users SET total_points = total_points + ? WHERE id = ?", [pointsAwarded, userId]);
      await connection.query("INSERT INTO submissions (user_id, task_id, submitted_flag, is_correct) VALUES (?, ?, ?, ?)", [userId, challengeId, flag, true]);
      await connection.commit();
      connection.release();
      
      // Invalidate caches after successful solve
      cacheManager.invalidateNamespace(CACHE_KEYS.CHALLENGES);
      cacheManager.invalidate(CACHE_KEYS.USER_SOLVES, { userId }, userId);
      cacheManager.invalidate(CACHE_KEYS.USER_STATS, { username: session?.user?.name }, userId);
      cacheManager.invalidateNamespace(CACHE_KEYS.LEADERBOARD);
      cacheManager.invalidate(CACHE_KEYS.USER_ACHIEVEMENTS, { userId }, userId);
      
      return NextResponse.json({ success: true, message: "Correct flag!", points: pointsAwarded });
    } catch (err) {
      await connection.rollback();
      connection.release();
      throw err;
    }
  } catch (error: any) {
    console.error("Submission Error:", error);
    return NextResponse.json(
      { error: "Submission failed" },
      { status: 500 }
    );
  }
}
