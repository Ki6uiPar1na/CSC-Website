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

    const notifId = parseInt(id);
    if (isNaN(notifId)) {
      return NextResponse.json({ error: "Invalid notification ID" }, { status: 400 });
    }

    const [existing] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM notifications WHERE id = ?`,
      [notifId]
    );

    if (existing.length === 0) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    const { title, message, type, target_audience } = await request.json();

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

    const normalizedAudience = target_audience
      ? audienceMap[target_audience] || target_audience
      : undefined;

    const updates: string[] = [];
    const queryParams: any[] = [];

    if (title !== undefined) { updates.push("title = ?"); queryParams.push(title); }
    if (message !== undefined) { updates.push("message = ?"); queryParams.push(message); }
    if (type !== undefined) { updates.push("type = ?"); queryParams.push(type); }
    if (normalizedAudience !== undefined) { updates.push("target_audience = ?"); queryParams.push(normalizedAudience); }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    queryParams.push(notifId);
    await pool.query(
      `UPDATE notifications SET ${updates.join(", ")} WHERE id = ?`,
      queryParams
    );

    return NextResponse.json({ success: true, message: "Notification updated successfully" });
  } catch (error: any) {
    console.error("Update Notification Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update notification" },
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

    const notifId = parseInt(id);
    if (isNaN(notifId)) {
      return NextResponse.json({ error: "Invalid notification ID" }, { status: 400 });
    }

    const [existing] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM notifications WHERE id = ?`,
      [notifId]
    );

    if (existing.length === 0) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    await pool.query(`DELETE FROM notifications WHERE id = ?`, [notifId]);

    return NextResponse.json({ success: true, message: "Notification deleted successfully" });
  } catch (error: any) {
    console.error("Delete Notification Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete notification" },
      { status: 500 }
    );
  }
}
