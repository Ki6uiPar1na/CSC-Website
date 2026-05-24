import { NextResponse, NextRequest } from "next/server";
import { checkAdminRole } from "@/lib/admin-auth";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";
import { generateEventSlug, generateEventCode, makeSlugUnique } from "@/lib/eventUtils";
import { sendEventNotification } from "@/lib/mailer";

export async function GET(request: NextRequest) {
  try {
    const auth = await checkAdminRole([1, 2]);
    if (!auth.authorized) return auth.response;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "15");
    const offset = (page - 1) * limit;

    const [countResult] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) as total FROM events"
    );
    const total = (countResult[0] as any).total;

    const [events] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM events ORDER BY event_date DESC, event_time DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    return NextResponse.json({
      events,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error("Get Events Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch events" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await checkAdminRole([1, 2]);
    if (!auth.authorized) return auth.response;

    const userId = auth.userId;

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

    // Validate required fields
    if (!title || !type || !event_type || !event_date || !event_time) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate event_type
    if (!["online", "offline", "hybrid"].includes(event_type)) {
      return NextResponse.json(
        { error: "Invalid event type" },
        { status: 400 }
      );
    }

    // Validate location/link based on event type
    if (event_type === "offline" && !location) {
      return NextResponse.json(
        { error: "Location is required for offline events" },
        { status: 400 }
      );
    }

    if (event_type === "online" && (!meeting_link || !platform_name)) {
      return NextResponse.json(
        { error: "Meeting link and platform name are required for online events" },
        { status: 400 }
      );
    }

    // Generate slug from title
    const baseSlug = generateEventSlug(title);
    
    // Check existing slugs to make it unique
    const [existingSlugs] = await pool.query<RowDataPacket[]>(
      `SELECT slug FROM events WHERE slug LIKE ?`,
      [`${baseSlug}%`]
    );
    const slugs = existingSlugs.map(row => row.slug as string);
    const uniqueSlug = makeSlugUnique(baseSlug, slugs);

    // Generate unique event code
    let eventCode = generateEventCode();
    let codeExists = true;
    let attempts = 0;

    // Ensure event code is unique (very rare chance of collision but let's be safe)
    while (codeExists && attempts < 5) {
      const [existingCode] = await pool.query<RowDataPacket[]>(
        `SELECT id FROM events WHERE event_code = ?`,
        [eventCode]
      );
      codeExists = existingCode.length > 0;
      if (codeExists) {
        eventCode = generateEventCode();
      }
      attempts++;
    }

    if (codeExists) {
      return NextResponse.json(
        { error: "Failed to generate unique event code" },
        { status: 500 }
      );
    }

    // Create event with slug and event_code
    const [result] = await pool.query(
      `INSERT INTO events (title, type, description, slug, event_code, event_type, event_date, event_time, location, platform_name, meeting_link, capacity, is_premium, target_audience, photo_url, gallery_images, exclusivity_expires_at, convert_to_contest)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, type, description, uniqueSlug, eventCode, event_type, event_date, event_time, location, platform_name, meeting_link, capacity, is_premium || false, target_audience || 'all', photo_url || null, gallery_images || null, exclusivity_expires_at || null, convert_to_contest || false]
    );

    // Determine target audience based on event premium status
    const targetAudience = is_premium ? 'premium_users' : 'all_users';

    // Create notification message with event link - using eventCode in URL as requested
    const notificationMessage = `New event "${title}" has been created!${is_premium ? '\n\nNote: This is currently a Premium Exclusive event.' : ''}\n\nEvent Code: ${eventCode}\n\nVisit /events/${eventCode} to view full details.`;

    // Send broadcast notification to appropriate users
    const eventNotif = await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, target_audience, created_at)
       VALUES (NULL, 'event_update', 'New Event Created', ?, ?, NOW())`,
      [notificationMessage, targetAudience]
    );
    console.log("Event creation notification sent to", targetAudience, ":", eventNotif);

    // Send email notifications
    try {
      let userRows: RowDataPacket[];
      if (is_premium) {
        [userRows] = await pool.query<RowDataPacket[]>(
          `SELECT DISTINCT u.email FROM users u
           JOIN upgrade_codes uc ON u.id = uc.used_by_user_id
           WHERE uc.is_active = TRUE AND (uc.expires_at IS NULL OR uc.expires_at > NOW())
           AND u.email IS NOT NULL AND u.email != ''`
        );
      } else {
        [userRows] = await pool.query<RowDataPacket[]>(
          `SELECT email FROM users WHERE status = 'approved' AND email IS NOT NULL AND email != ''`
        );
      }
      const emails = userRows.map((r: any) => r.email).filter(Boolean);
      const { sent, failed } = await sendEventNotification(emails, {
        title,
        description: description || null,
        event_date,
        event_time,
        event_type,
        location: location || null,
        platform_name: platform_name || null,
        meeting_link: meeting_link || null,
        is_premium: !!is_premium,
        event_code: eventCode,
        share_url: uniqueSlug,
      });
      console.log(`Event emails: ${sent} sent, ${failed} failed`);
    } catch (err) {
      console.error("Event email dispatch error:", err);
    }

    return NextResponse.json({
      message: "Event created successfully",
      event_id: (result as any).insertId,
      event_slug: uniqueSlug,
      event_code: eventCode,
      share_url: `/events/${uniqueSlug}`,
    });
  } catch (error: any) {
    console.error("Create Event Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create event" },
      { status: 500 }
    );
  }
}
