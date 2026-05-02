import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json({ error: "Event slug is required" }, { status: 400 });
    }

    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = "id" in session.user ? parseInt((session.user as any).id) : null;
    if (!userId) {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }

    // Check if user is premium
    const [userRows] = await pool.query<RowDataPacket[]>(
      `SELECT u.id,
        CASE 
          WHEN MAX(uc.id) IS NOT NULL AND MAX(uc.is_active) = TRUE AND MAX(uc.expires_at) > NOW() THEN TRUE 
          ELSE FALSE 
        END as is_premium,
        u.role_id
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

    // Fetch event by slug or event_code
    const [events] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM events WHERE (slug = ? OR event_code = ?) AND is_active = TRUE`,
      [slug, slug]
    );

    if (events.length === 0) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const event = events[0];

    // Visibility Logic for Non-Admins:
    // 1. If event is finished (date < NOW), show to everyone.
    // 2. If event is upcoming (date >= NOW):
    //    - If target_audience is 'all', show to everyone.
    //    - If target_audience is 'premium', show only to premium users.
    //    - If target_audience is 'free', show only to non-premium users.
    if (!isAdmin) {
      const eventDateTime = new Date(`${event.event_date}T${event.event_time}`);
      const now = new Date();
      const isFinished = eventDateTime < now;

      if (!isFinished) {
        const target = event.target_audience || 'all';
        let accessible = false;

        if (target === 'all') accessible = true;
        else if (target === 'premium' && isPremium) accessible = true;
        else if (target === 'free' && !isPremium) accessible = true;

        if (!accessible) {
          return NextResponse.json({ 
            error: target === 'premium' ? "This event is exclusive to Premium members." : "You do not have access to this event.",
            is_premium_required: target === 'premium' 
          }, { status: 403 });
        }
      }
    }

    // Backward compatibility for is_premium exclusivity (if any existing events rely on it)
    if (event.is_premium && !isPremium && !isAdmin) {
      const now = new Date();
      const expiry = event.exclusivity_expires_at ? new Date(event.exclusivity_expires_at) : null;
      if (!expiry || expiry > now) {
        return NextResponse.json({ 
          error: "This event is exclusive to Premium members.",
          is_premium_required: true 
        }, { status: 403 });
      }
    }

    return NextResponse.json({
      success: true,
      event: {
        id: event.id,
        title: event.title,
        description: event.description,
        type: event.type,
        event_type: event.event_type,
        event_date: event.event_date,
        event_time: event.event_time,
        location: event.location,
        platform_name: event.platform_name,
        meeting_link: event.meeting_link,
        capacity: event.capacity,
        registered_count: event.registered_count,
        is_premium: event.is_premium,
        target_audience: event.target_audience,
        photo_url: event.photo_url,
        gallery_images: event.gallery_images,
        exclusivity_expires_at: event.exclusivity_expires_at,
        is_active: event.is_active,
        slug: event.slug,
        event_code: event.event_code,
        created_at: event.created_at,
        updated_at: event.updated_at,
      },
    });
  } catch (error: any) {
    console.error("Get Event by Slug Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch event" },
      { status: 500 }
    );
  }
}
