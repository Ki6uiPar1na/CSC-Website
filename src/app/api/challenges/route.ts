import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";
import { withCache, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";
import { enforceRateLimit } from "@/lib/rateLimitMiddleware";

export async function GET(req: NextRequest) {
  try {
    // Rate limiting (60 per minute)
    const { allowed, response: rateLimitResponse } = await enforceRateLimit(
      req,
      "GET_CHALLENGES"
    );

    if (!allowed) {
      return rateLimitResponse!;
    }

    const session = await getServerSession(authOptions);
    const userId = session?.user && "id" in session.user ? parseInt((session.user as any).id) : null;
    const userRole = session?.user && "role" in session.user ? (session.user as any).role : null;

    // Fetch user to check premium status via upgrade codes
    let isPremium = false;
    if (userId) {
      const isPremiumCached = await withCache(
        CACHE_KEYS.USER_PROFILE,
        async () => {
          const [premiumRows] = await pool.query<RowDataPacket[]>(
            `SELECT 1 FROM upgrade_code_usage u 
             JOIN upgrade_codes c ON u.upgrade_code_id = c.id 
             WHERE u.user_id = ? AND c.is_active = TRUE LIMIT 1`,
            [userId]
          );
          return premiumRows.length > 0;
        },
        CACHE_TTL.SHORT,
        { userId },
        userId
      );
      isPremium = isPremiumCached;
    }
    const isAdmin = userRole === 1;

    const { searchParams } = new URL(req.url);
    const moduleId = searchParams.get("moduleId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "15");
    const offset = (page - 1) * limit;

    const challenges = await withCache(
      CACHE_KEYS.CHALLENGES,
      async () => {
        let query = `
          SELECT c.*, 
                 COALESCE(
                   (SELECT JSON_ARRAYAGG(JSON_OBJECT('url', cu.url, 'display_name', cu.display_name)) 
                    FROM challenge_urls cu WHERE cu.challenge_id = c.id),
                   JSON_ARRAY()
                 ) as urls,
                 EXISTS(SELECT 1 FROM solves s WHERE s.challenge_id = c.id AND s.user_id = ?) as is_solved
          FROM challenges c
        `;
        const params: any[] = [userId];

        let whereClauses = [];
        if (moduleId) {
          whereClauses.push("c.module_id = ?");
          params.push(moduleId);
        }

        if (!isAdmin && !isPremium) {
          whereClauses.push("c.is_premium = 0");
        }

        if (whereClauses.length > 0) {
          query += " WHERE " + whereClauses.join(" AND ");
        }

        query += " ORDER BY c.id ASC LIMIT ? OFFSET ?";
        params.push(limit, offset);

        const [result]: any = await pool.query<RowDataPacket[]>(query, params);
        return result || [];
      },
      CACHE_TTL.MEDIUM,
      { moduleId, isPremium, isAdmin, page },
      userId
    );

    const [totalResult] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) as total FROM challenges"
    );
    const total = (totalResult[0] as any).total;

    const filteredChallenges = (challenges || []).map((chal: any) => {
      if (!chal.prerequisite_id) return { ...chal, is_locked: false };
      
      const prereqSolved = challenges.find((c: any) => c.id === chal.prerequisite_id)?.is_solved;
      return { ...chal, is_locked: !prereqSolved };
    });

    return NextResponse.json({
      challenges: filteredChallenges,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }, { status: 200 });
  } catch (error: any) {
    console.error("Fetch Challenges Error:", error);
    return NextResponse.json({ error: error.message, challenges: [] }, { status: 500 });
  }
}
