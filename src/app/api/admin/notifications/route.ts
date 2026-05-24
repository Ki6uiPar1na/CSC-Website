import { NextResponse, NextRequest } from "next/server";
import { checkAdminRole } from "@/lib/admin-auth";
import pool from "@/models/db";
import { RowDataPacket, ResultSetHeader } from "mysql2";

export async function GET(request: NextRequest) {
  try {
    const auth = await checkAdminRole([1, 2]);
    if (!auth.authorized) return auth.response;

    const { searchParams } = new URL(request.url);
    const audience = searchParams.get("audience") || "all";
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    let whereClause = "WHERE 1=1";
    const params: any[] = [];

    if (audience === "premium") {
      whereClause += " AND target_audience = 'premium_users'";
    } else if (audience === "non_premium" || audience === "free" || audience === "non-premium") {
      whereClause += " AND target_audience = 'non_premium_users'";
    } else if (audience === "user") {
      whereClause += " AND target_audience = 'user'";
    } else if (audience === "all_users" || audience === "all") {
      // Show all - no additional filter
    }

    if (search) {
      whereClause += " AND (title LIKE ? OR message LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    const [countResult] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM notifications ${whereClause}`,
      params
    );
    const total = (countResult[0] as any).total;

    params.push(limit, offset);
    const [notifications] = await pool.query<RowDataPacket[]>(
      `SELECT n.*, u.username 
       FROM notifications n
       LEFT JOIN users u ON n.user_id = u.id
       ${whereClause}
       ORDER BY n.created_at DESC
       LIMIT ? OFFSET ?`,
      params
    );

    return NextResponse.json({
      notifications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error("Get Notifications Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await checkAdminRole([1, 2]);
    if (!auth.authorized) return auth.response;

    const userId = auth.userId;
    const { type, title, message, target_audience, recipients, user_id } = await request.json();

    const audience = target_audience || recipients || "all_users";

    if (!title || !message) {
      return NextResponse.json(
        { error: "Missing required fields: title and message" },
        { status: 400 }
      );
    }

    const audienceMap: { [key: string]: string } = {
      all: "all_users",
      all_users: "all_users",
      premium: "premium_users",
      premium_users: "premium_users",
      free: "non_premium_users",
      "non-premium": "non_premium_users",
      non_premium_users: "non_premium_users",
      user: "user",
    };

    const normalizedAudience = audienceMap[audience];

    if (!normalizedAudience) {
      return NextResponse.json(
        { error: "Invalid target audience" },
        { status: 400 }
      );
    }

    const notifType = type || "broadcast";

    if (normalizedAudience === "user" && user_id) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, target_audience, created_at)
         VALUES (?, ?, ?, ?, 'user', NOW())`,
        [user_id, notifType, title, message]
      );
    } else {
      await pool.query(
        `INSERT INTO notifications (type, title, message, target_audience, created_at)
         VALUES (?, ?, ?, ?, NOW())`,
        [notifType, title, message, normalizedAudience]
      );
    }

    return NextResponse.json(
      { success: true, message: "Notification created successfully" },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Create Notification Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create notification" },
      { status: 500 }
    );
  }
}
