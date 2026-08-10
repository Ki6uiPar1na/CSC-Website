import { NextResponse, NextRequest } from "next/server";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withCache, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user && "id" in session.user ? parseInt((session.user as any).id) : null;
    const userRole = session?.user && "role" in session.user ? (session.user as any).role : null;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check viewer premium status via upgrade codes
    let isPremium = false;
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
    const isAdmin = userRole === 1;

    const { resourceId, completed } = await req.json();

    if (!resourceId) {
      return NextResponse.json({ error: "resourceId is required" }, { status: 400 });
    }

    // Verify resource exists
    const [resource] = await pool.query<RowDataPacket[]>(
      "SELECT id, is_premium FROM resources WHERE id = ?",
      [resourceId]
    );
    if (resource.length === 0) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    // Premium resources require a club membership to track progress
    if (resource[0].is_premium && !isPremium && !isAdmin) {
      return NextResponse.json(
        { error: "Join as a club member to track progress on premium resources" },
        { status: 403 }
      );
    }

    if (completed) {
      await pool.query(
        "INSERT IGNORE INTO resource_completions (user_id, resource_id) VALUES (?, ?)",
        [userId, resourceId]
      );
    } else {
      await pool.query(
        "DELETE FROM resource_completions WHERE user_id = ? AND resource_id = ?",
        [userId, resourceId]
      );
    }

    return NextResponse.json({ success: true, completed });
  } catch (error: any) {
    console.error("Resource completion error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
