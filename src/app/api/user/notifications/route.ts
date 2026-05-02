import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";

// GET: Retrieve user notifications
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = "id" in session.user ? parseInt((session.user as any).id) : null;
    if (!userId) {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }

    // Get user's premium status (check upgrade codes)
    const [premiumCheck] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM upgrade_codes WHERE used_by_user_id = ? AND is_active = TRUE AND expires_at > NOW() LIMIT 1`,
      [userId]
    );

    const isPremium = premiumCheck.length > 0;
    console.log(`User ${userId} premium status: ${isPremium}`);

    // Build the query based on user's premium status
    let query = `SELECT id, type, title, message, is_read, target_audience, created_at FROM notifications 
       WHERE user_id = ? OR target_audience = 'all_users'`;
    const params: any[] = [userId];

    if (isPremium) {
      // Premium users see: personal + all_users + premium_users
      query += ` OR target_audience = 'premium_users'`;
    } else {
      // Free users see: personal + all_users + non_premium_users
      query += ` OR target_audience = 'non_premium_users'`;
    }

    query += ` ORDER BY created_at DESC LIMIT 50`;

    const [notifications] = await pool.query<RowDataPacket[]>(query, params);

    console.log(`Found ${notifications.length} notifications for user ${userId}`);

    // Count unread notifications (for this user or broadcast)
    let unreadQuery = `SELECT COUNT(*) as count FROM notifications 
       WHERE is_read = 0 AND (
         user_id = ? OR target_audience = 'all_users'`;
    const unreadParams: any[] = [userId];

    if (isPremium) {
      unreadQuery += ` OR target_audience = 'premium_users'`;
    } else {
      unreadQuery += ` OR target_audience = 'non_premium_users'`;
    }

    unreadQuery += `)`;

    const [unreadResult] = await pool.query<RowDataPacket[]>(unreadQuery, unreadParams);

    const unreadCount = (unreadResult[0] as any)?.count || 0;
    console.log(`Unread count: ${unreadCount}`);

    return NextResponse.json({
      notifications: notifications.map((n) => ({
        id: n.id.toString(),
        type: n.type,
        title: n.title,
        message: n.message,
        timestamp: n.created_at,
        read: n.is_read === 1,
        targetAudience: (n as any).target_audience,
      })),
      unreadCount,
    });
  } catch (error: any) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

// PUT: Mark notification as read
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = "id" in session.user ? parseInt((session.user as any).id) : null;
    if (!userId) {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }

    const { notificationId } = await request.json();

    if (!notificationId) {
      return NextResponse.json(
        { error: "Notification ID required" },
        { status: 400 }
      );
    }

    // Check if user can mark this notification as read (must be theirs or broadcast)
    const [check] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM notifications WHERE id = ? AND (user_id = ? OR user_id IS NULL)`,
      [parseInt(notificationId), userId]
    );

    if (check.length === 0) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    // Update notification as read
    await pool.query(
      `UPDATE notifications SET is_read = 1 WHERE id = ?`,
      [parseInt(notificationId)]
    );

    return NextResponse.json({ message: "Notification marked as read" });
  } catch (error: any) {
    console.error("Error updating notification:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update notification" },
      { status: 500 }
    );
  }
}

// DELETE: Delete a notification
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = "id" in session.user ? parseInt((session.user as any).id) : null;
    if (!userId) {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }

    const { notificationId } = await request.json();

    if (!notificationId) {
      return NextResponse.json(
        { error: "Notification ID required" },
        { status: 400 }
      );
    }

    // Delete notification
    await pool.query(
      `DELETE FROM notifications WHERE id = ? AND user_id = ?`,
      [parseInt(notificationId), userId]
    );

    return NextResponse.json({ message: "Notification deleted" });
  } catch (error: any) {
    console.error("Error deleting notification:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete notification" },
      { status: 500 }
    );
  }
}
