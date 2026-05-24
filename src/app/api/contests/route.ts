import { NextRequest, NextResponse } from "next/server";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";
import { withCache, CACHE_KEYS, CACHE_TTL, cacheManager } from "@/lib/cache";
import { enforceRateLimit } from "@/lib/rateLimitMiddleware";

export async function GET(req: NextRequest) {
  try {
    const { allowed, response: rateLimitResponse } = await enforceRateLimit(
      req,
      "GET_CONTESTS"
    );

    if (!allowed) {
      return rateLimitResponse!;
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "15");
    const offset = (page - 1) * limit;

    const [totalResult] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) as total FROM contests WHERE ctftime_event_id IS NULL"
    );
    const total = (totalResult[0] as any).total;

    const result = await withCache(
      CACHE_KEYS.CONTESTS,
      async () => {
        const [data] = await pool.query<RowDataPacket[]>(
          `SELECT c.*, t.name as team_name
           FROM contests c
           LEFT JOIN teams t ON t.id = c.team_id
           WHERE c.ctftime_event_id IS NULL
           ORDER BY c.event_date DESC LIMIT ? OFFSET ?`,
          [limit, offset]
        );
        return data;
      },
      CACHE_TTL.LONG,
      { page }
    );
    return NextResponse.json({ contests: result, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("Error fetching contests:", error);
    return NextResponse.json(
      { error: "Failed to fetch contests" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, event_date, winners, photo_url, details, team_id, ctftime_event_id } =
      body;

    if (!name) {
      return NextResponse.json(
        { error: "Contest name is required" },
        { status: 400 }
      );
    }

    const result = await pool.query(
      "INSERT INTO contests (name, description, event_date, winners, photo_url, details, team_id, ctftime_event_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        name,
        description || null,
        event_date || null,
        winners ? JSON.stringify(winners) : null,
        photo_url || null,
        details || null,
        team_id || null,
        ctftime_event_id || null,
      ]
    );

    // Invalidate cache on new entry
    cacheManager.invalidateNamespace(CACHE_KEYS.CONTESTS);

    return NextResponse.json(
      { id: (result as any)[0].insertId, name },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating contest:", error);
    return NextResponse.json(
      { error: "Failed to create contest" },
      { status: 500 }
    );
  }
}
