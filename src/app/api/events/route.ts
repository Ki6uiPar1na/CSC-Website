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
      "GET_EVENTS"
    );

    if (!allowed) {
      return rateLimitResponse!;
    }
    const session = await getServerSession(authOptions);

    let userId: number | null = null;
    let isAdmin = false;
    let isPremium = false;

    if (session?.user && "id" in session.user) {
      userId = parseInt((session.user as any).id);
      
      const userInfo = await withCache(
        `${CACHE_KEYS.USER_PROFILE}:events`,
        async () => {
          const [userRows] = await pool.query<RowDataPacket[]>(
            `SELECT u.id, u.role_id,
              CASE 
                WHEN MAX(uc.id) IS NOT NULL AND MAX(uc.is_active) = TRUE AND MAX(uc.expires_at) > NOW() THEN TRUE 
                ELSE FALSE 
              END as is_premium
             FROM users u
             LEFT JOIN upgrade_codes uc ON u.id = uc.used_by_user_id
             WHERE u.id = ?
             GROUP BY u.id`,
            [userId]
          );
          return userRows.length > 0 ? userRows[0] : null;
        },
        CACHE_TTL.SHORT,
        { userId },
        userId
      );

      if (userInfo) {
        isAdmin = userInfo.role_id === 1;
        isPremium = userInfo.is_premium === 1 || userInfo.is_premium === true || isAdmin;
      }
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "15");
    const offset = (page - 1) * limit;

    const [totalResult] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) as total FROM events WHERE is_active = TRUE"
    );
    const total = (totalResult[0] as any).total;

    const events = await withCache(
      CACHE_KEYS.EVENTS,
      async () => {
        let query = `
          SELECT 
            e.id,
            e.title,
            e.type,
            e.description,
            e.slug,
            e.event_code,
            e.event_type,
            e.event_date,
            e.event_time,
            e.location,
            e.platform_name,
            e.meeting_link,
            e.capacity,
            e.registered_count,
            e.is_premium,
            e.target_audience,
            e.photo_url,
            e.gallery_images,
            e.exclusivity_expires_at,
            e.created_at
            ${userId ? ", r.rsvp_status" : ""}
          FROM events e
          ${userId ? "LEFT JOIN event_rsvps r ON e.id = r.event_id AND r.user_id = ?" : ""}
          WHERE e.is_active = TRUE
        `;

        if (!isAdmin) {
          const dateFilter = `(
            (event_date < CURDATE()) OR 
            (event_date = CURDATE() AND event_time <= CURTIME()) OR
            (
              (event_date > CURDATE() OR (event_date = CURDATE() AND event_time > CURTIME())) AND 
              (
                target_audience = 'all' OR 
                (target_audience = 'premium' AND ${isPremium ? 'TRUE' : 'FALSE'}) OR 
                (target_audience = 'free' AND ${!isPremium ? 'TRUE' : 'FALSE'})
              )
            )
          )`;

          query += ` AND ${dateFilter}`;

          if (!isPremium) {
            query += ` AND (is_premium = FALSE OR (is_premium = TRUE AND exclusivity_expires_at IS NOT NULL AND exclusivity_expires_at <= NOW()))`;
          }
        }

        query += ` ORDER BY event_date DESC, event_time DESC LIMIT ? OFFSET ?`;

        const [result] = userId 
          ? await pool.query<RowDataPacket[]>(query, [userId, limit, offset])
          : await pool.query<RowDataPacket[]>(query, [limit, offset]);
        
        return result;
      },
      CACHE_TTL.MEDIUM,
      { userId, isPremium, isAdmin, page }
    );

    return NextResponse.json({
      events,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      isPremium,
      message: isPremium 
        ? "Showing all accessible events (Premium & Free)" 
        : "Showing accessible events based on your status.",
    });
  } catch (error: any) {
    console.error("Get Events Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch events" },
      { status: 500 }
    );
  }
}
