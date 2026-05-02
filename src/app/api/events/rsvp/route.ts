import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/models/db";
import { RowDataPacket, ResultSetHeader } from "mysql2";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = "id" in session.user ? parseInt((session.user as any).id) : null;
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");

    if (!eventId || !userId) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT rsvp_status FROM event_rsvps WHERE event_id = ? AND user_id = ?",
      [eventId, userId]
    );

    return NextResponse.json({ 
      rsvpStatus: rows.length > 0 ? rows[0].rsvp_status : null 
    });
  } catch (error: any) {
    console.error("GET RSVP Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = "id" in session.user ? parseInt((session.user as any).id) : null;
    const body = await req.json();
    const { eventId, status } = body; // status: 'going', 'maybe', 'interested' or null to remove

    if (!eventId || !userId) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    // Check if event is already finished
    const [eventRows] = await pool.query<RowDataPacket[]>(
      "SELECT event_date, event_time FROM events WHERE id = ?",
      [eventId]
    );

    if (eventRows.length === 0) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const event = eventRows[0];
    const eventDate = new Date(event.event_date);
    const now = new Date();
    
    // Simple date comparison for safety
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (eventDate < today) {
      return NextResponse.json({ error: "Cannot RSVP to a past event" }, { status: 400 });
    }

    if (!status) {
      // Remove RSVP
      await pool.query(
        "DELETE FROM event_rsvps WHERE event_id = ? AND user_id = ?",
        [eventId, userId]
      );
    } else {
      // Upsert RSVP
      await pool.query(
        `INSERT INTO event_rsvps (event_id, user_id, rsvp_status) 
         VALUES (?, ?, ?) 
         ON DUPLICATE KEY UPDATE rsvp_status = VALUES(rsvp_status)`,
        [eventId, userId, status]
      );
    }

    // Update registered_count in events table
    const [countRows] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) as count FROM event_rsvps WHERE event_id = ? AND rsvp_status = 'going'",
      [eventId]
    );
    const count = countRows[0].count;

    await pool.query(
      "UPDATE events SET registered_count = ? WHERE id = ?",
      [count, eventId]
    );

    return NextResponse.json({ message: "RSVP updated successfully", registered_count: count });
  } catch (error: any) {
    console.error("POST RSVP Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
