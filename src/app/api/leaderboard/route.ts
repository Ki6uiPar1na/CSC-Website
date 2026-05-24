import { NextResponse, NextRequest } from "next/server";
import { UserModel } from "@/models/UserModel";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";
import { withCache, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";
import { enforceRateLimit } from "@/lib/rateLimitMiddleware";

export async function GET(req: NextRequest) {
  try {
    const { allowed, response: rateLimitResponse } = await enforceRateLimit(
      req,
      "GET_LEADERBOARD"
    );

    if (!allowed) {
      return rateLimitResponse!;
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "15");
    const offset = (page - 1) * limit;

    const [totalResult] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) as total FROM users WHERE role_id != 1 AND status = 'approved'"
    );
    const total = (totalResult[0] as any).total;

    const leaderboard = await withCache(
      CACHE_KEYS.LEADERBOARD,
      () => UserModel.getLeaderboard(limit, offset),
      CACHE_TTL.LONG,
      { page }
    );
    return NextResponse.json({
      leaderboard,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
