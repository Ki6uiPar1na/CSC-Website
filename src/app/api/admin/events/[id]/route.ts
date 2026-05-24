import { NextResponse, NextRequest } from "next/server";
import { checkAdminRole } from "@/lib/admin-auth";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const auth = await checkAdminRole([1, 2]);
    if (!auth.authorized) return auth.response;

    const userId = auth.userId;

    const eventId = parseInt(id);
    if (isNaN(eventId)) {
      return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
    }

    const {
      title,
      type,
      description,
      event_type,
      event_date,
      event_time,
      location,
      platform_name,
      meeting_link,
      capacity,
      is_premium,
      target_audience,
      photo_url,
      gallery_images,
      exclusivity_expires_at,
      convert_to_contest,
    } = await request.json();

    // Check if event exists
    const [eventRows] = await pool.query<RowDataPacket[]>(
      `SELECT id, is_premium, is_converted FROM events WHERE id = ?`,
      [eventId]
    );

    if (eventRows.length === 0) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const event = eventRows[0];

    // Update event
    await pool.query(
      `UPDATE events 
       SET title = ?, type = ?, description = ?, event_type = ?, event_date = ?, event_time = ?, location = ?, platform_name = ?, meeting_link = ?, capacity = ?, is_premium = ?, target_audience = ?, photo_url = ?, gallery_images = ?, exclusivity_expires_at = ?, convert_to_contest = ?
       WHERE id = ?`,
      [title, type, description, event_type, event_date, event_time, location, platform_name, meeting_link, capacity, is_premium !== undefined ? is_premium : (event as any).is_premium, target_audience || 'all', photo_url !== undefined ? photo_url : (event as any).photo_url, gallery_images !== undefined ? gallery_images : (event as any).gallery_images, exclusivity_expires_at || null, convert_to_contest !== undefined ? convert_to_contest : (event as any).convert_to_contest, eventId]
    );

    // Send broadcast notification based on event premium status
    const targetAudience = is_premium ? 'premium_users' : 'all_users';
    const updateNotif = await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, target_audience, created_at)
       VALUES (NULL, 'event_update', 'Event Updated', ?, ?, NOW())`,
      [`Event "${title}" has been updated. Check the events page for details.`, targetAudience]
    );
    console.log("Event update notification sent:", updateNotif);

    return NextResponse.json({
      message: "Event updated successfully",
    });
  } catch (error: any) {
    console.error("Update Event Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update event" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const auth = await checkAdminRole([1, 2]);
    if (!auth.authorized) return auth.response;

    const userId = auth.userId;

    const eventId = parseInt(id);
    if (isNaN(eventId)) {
      return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
    }

    // Check if event exists
    const [eventRows] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM events WHERE id = ?`,
      [eventId]
    );

    if (eventRows.length === 0) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Delete event
    await pool.query(`DELETE FROM events WHERE id = ?`, [eventId]);

    return NextResponse.json({
      message: "Event deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete Event Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete event" },
      { status: 500 }
    );
  }
}
