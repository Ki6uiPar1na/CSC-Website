import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = "id" in session.user ? parseInt((session.user as any).id) : null;
    if (!userId) {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }

    // Check if user is premium and their role
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

    if (userRows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = userRows[0];
    const isAdmin = user.role_id === 1;
    const isPremium = user.is_premium === 1 || user.is_premium === true || isAdmin;

    // Get events based on premium status and target audience
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
        e.created_at,
        r.rsvp_status
      FROM events e
      LEFT JOIN event_rsvps r ON e.id = r.event_id AND r.user_id = ?
      WHERE e.is_active = TRUE
    `;

    // Visibility Logic:
    // Admin sees everything.
    if (!isAdmin) {
      // 1. If event is finished (date < NOW), show to everyone.
      // 2. If event is upcoming (date >= NOW):
      //    - If target_audience is 'all', show to everyone.
      //    - If target_audience is 'premium', show only to premium users.
      //    - If target_audience is 'free', show only to non-premium users.

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

      // Plus existing premium exclusivity logic if needed (backward compatibility)
      if (!isPremium) {
        query += ` AND (is_premium = FALSE OR (is_premium = TRUE AND exclusivity_expires_at IS NOT NULL AND exclusivity_expires_at <= NOW()))`;
      }
    }

    query += ` ORDER BY event_date DESC, event_time DESC LIMIT 100`;

    const [events] = await pool.query<RowDataPacket[]>(query, [userId]);

    return NextResponse.json({
      events,
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
