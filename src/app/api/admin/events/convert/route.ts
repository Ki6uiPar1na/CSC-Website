import { NextResponse, NextRequest } from "next/server";
import { checkAdminRole } from "@/lib/admin-auth";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";
import { cacheManager, CACHE_KEYS } from "@/lib/cache";

export async function POST(request: NextRequest) {
  try {
    const auth = await checkAdminRole([1, 2]);
    if (!auth.authorized) return auth.response;

    const { event_id } = await request.json();

    if (!event_id) {
      return NextResponse.json(
        { error: "Event ID is required" },
        { status: 400 }
      );
    }

    // Fetch event
    const [eventRows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM events WHERE id = ?`,
      [event_id]
    );

    if (eventRows.length === 0) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const event = eventRows[0] as any;

    if (event.is_converted) {
      return NextResponse.json(
        { error: "Event has already been converted to a contest" },
        { status: 400 }
      );
    }

    const eventDate = new Date(event.event_date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (eventDate > today) {
      return NextResponse.json(
        { error: "Cannot convert a future event to contest" },
        { status: 400 }
      );
    }

    // Create contest entry
    const contestName = event.title;
    const [contestResult] = await pool.query(
      `INSERT INTO contests (name, description, event_date, photo_url, details)
       VALUES (?, ?, ?, ?, ?)`,
      [
        contestName,
        event.description || null,
        event.event_date,
        event.photo_url || null,
        event.description || null,
      ]
    );

    const contestId = (contestResult as any).insertId;

    // Create competition achievement entry
    const achievementName = event.is_premium ? `${event.title} (Premium)` : event.title;
    await pool.query(
      `INSERT INTO competition_achievements (competition_name, contest_name, team_name, team_members, is_team_contest, description, gallery_images, achievement_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        achievementName,
        event.title,
        null,
        null,
        true,
        event.description || null,
        event.gallery_images || null,
        event.event_date,
      ]
    );

    // Mark event as converted
    await pool.query(
      `UPDATE events SET is_converted = TRUE WHERE id = ?`,
      [event_id]
    );

    // Invalidate caches
    cacheManager.invalidateNamespace(CACHE_KEYS.CONTESTS);
    cacheManager.invalidateNamespace(CACHE_KEYS.CLUB_ACHIEVEMENTS);

    return NextResponse.json({
      message: "Event converted to contest successfully",
      contest_id: contestId,
    });
  } catch (error: any) {
    console.error("Convert Event Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to convert event" },
      { status: 500 }
    );
  }
}
