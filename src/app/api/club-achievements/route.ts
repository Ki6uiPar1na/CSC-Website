import { NextRequest, NextResponse } from "next/server";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";
import { withCache, CACHE_KEYS, CACHE_TTL, cacheManager } from "@/lib/cache";
import { enforceRateLimit } from "@/lib/rateLimitMiddleware";
import { checkAdminRole } from "@/lib/admin-auth";

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
    const result = await withCache(
      CACHE_KEYS.CLUB_ACHIEVEMENTS,
      async () => {
        try {
          const [data] = await pool.query<RowDataPacket[]>(
            "SELECT * FROM competition_achievements ORDER BY achievement_date DESC"
          );
          console.log("[ACHIEVEMENTS] Query executed, rows returned:", data?.length || 0);
          return Array.isArray(data) ? data : [];
        } catch (dbError) {
          console.error("[ACHIEVEMENTS] Database query failed:", dbError);
          return [];
        }
      },
      CACHE_TTL.MEDIUM
    );
    console.log("[ACHIEVEMENTS] API returning:", result?.length || 0, "achievements");
    return NextResponse.json(result || []);
  } catch (error) {
    console.error("Error fetching achievements:", error);
    // Return empty array instead of error to prevent page from breaking
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await checkAdminRole([1]);
    if (!auth.authorized) return auth.response;
    const body = await req.json();
    const {
      competition_name,
      contest_name,
      team_name,
      team_members,
      is_team_contest,
      position,
      prize_money,
      description,
      achievement_date,
    } = body;

    if (!competition_name || !contest_name) {
      return NextResponse.json(
        { error: "Competition name and contest name are required" },
        { status: 400 }
      );
    }

    const result = await pool.query(
      "INSERT INTO competition_achievements (competition_name, contest_name, team_name, team_members, is_team_contest, position, prize_money, description, achievement_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        competition_name,
        contest_name,
        team_name || null,
        team_members || null,
        is_team_contest === undefined ? 1 : is_team_contest,
        position || null,
        prize_money || null,
        description || null,
        achievement_date || null,
      ]
    );

    // Invalidate cache on new entry
    cacheManager.invalidateNamespace(CACHE_KEYS.CLUB_ACHIEVEMENTS);

    return NextResponse.json(
      { id: (result as any)[0].insertId, competition_name, contest_name },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating achievement:", error);
    return NextResponse.json(
      { error: "Failed to create achievement" },
      { status: 500 }
    );
  }
}
