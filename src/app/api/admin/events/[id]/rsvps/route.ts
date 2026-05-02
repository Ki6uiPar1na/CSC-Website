import { NextRequest, NextResponse } from "next/server";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";
import { checkAdminRole } from "@/lib/admin-auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await checkAdminRole([1, 2]); // Admin and Instructor
    if (!auth.authorized) return auth.response;

    const [rsvps] = await pool.query<RowDataPacket[]>(
      `SELECT r.rsvp_status, r.created_at, u.username, u.email, u.status as user_status
       FROM event_rsvps r
       JOIN users u ON r.user_id = u.id
       WHERE r.event_id = ?
       ORDER BY r.created_at DESC`,
      [id]
    );

    const [event] = await pool.query<RowDataPacket[]>(
      "SELECT title, capacity, registered_count FROM events WHERE id = ?",
      [id]
    );

    return NextResponse.json({ 
      rsvps,
      event: event[0]
    });
  } catch (error: any) {
    console.error("Admin Fetch RSVPs Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
