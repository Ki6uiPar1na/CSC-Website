import { NextResponse } from "next/server";
import pool from "@/models/db";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import { checkAdminRole } from "@/lib/admin-auth";

export async function POST(req: Request) {
  try {
    const auth = await checkAdminRole([1, 2]); // Admin and Instructor
    if (!auth.authorized) return auth.response;

    const userId = auth.userId;
    const { title, message, target_audience, recipients, type } = await req.json();

    // Accept both target_audience and recipients for backward compatibility
    const audience = target_audience || recipients;

    if (!title || !message || !audience) {
      return NextResponse.json({ error: "Missing required fields: title, message, and target_audience/recipients" }, { status: 400 });
    }

    // Map recipients values to target_audience values
    const audienceMap: { [key: string]: string } = {
      "all": "all",
      "premium": "premium",
      "free": "non-premium",
      "non-premium": "non-premium",
    };

    const normalizedAudience = audienceMap[audience];

    if (!normalizedAudience) {
      return NextResponse.json({ error: "Invalid target audience. Must be one of: all, premium, free, non-premium" }, { status: 400 });
    }

    // Determine which users to send notifications to
    let targetUsers: RowDataPacket[] = [];

    console.log("Normalized audience:", normalizedAudience);

    if (normalizedAudience === "all") {
      const [allUsers] = await pool.query<RowDataPacket[]>(
        "SELECT id FROM users WHERE role_id != 1"
      );
      console.log("All users found:", allUsers.length);
      targetUsers = allUsers;
    } else if (normalizedAudience === "premium") {
      // Find users with active premium codes
      const [premiumUsers] = await pool.query<RowDataPacket[]>(
        `SELECT DISTINCT u.id FROM users u 
         WHERE u.role_id != 1 
         AND EXISTS (
           SELECT 1 FROM upgrade_codes uc 
           WHERE uc.used_by_user_id = u.id 
           AND uc.is_active = TRUE 
           AND uc.expires_at > NOW()
         )`
      );
      console.log("Premium users found:", premiumUsers.length);
      targetUsers = premiumUsers;
    } else if (normalizedAudience === "non-premium") {
      // Find users without active premium codes
      const [nonPremiumUsers] = await pool.query<RowDataPacket[]>(
        `SELECT u.id FROM users u 
         WHERE u.role_id != 1 
         AND NOT EXISTS (
           SELECT 1 FROM upgrade_codes uc 
           WHERE uc.used_by_user_id = u.id 
           AND uc.is_active = TRUE 
           AND uc.expires_at > NOW()
         )`
      );
      console.log("Non-premium users found:", nonPremiumUsers.length);
      targetUsers = nonPremiumUsers;
    }

    console.log("Target users:", targetUsers);
    console.log("Total users queried for reference:", targetUsers.length);

    // Map normalized audience to database target_audience values
    const targetAudienceMap: { [key: string]: string } = {
      "all": "all_users",
      "premium": "premium_users",
      "non-premium": "non_premium_users",
    };

    const targetAudience = targetAudienceMap[normalizedAudience];
    console.log("Target audience for database:", targetAudience);

    // Insert a SINGLE broadcast notification with target_audience (not per-user)
    // This allows filtering based on user's premium status
    try {
      await pool.query(
        `INSERT INTO notifications (type, title, message, target_audience, created_at)
         VALUES (?, ?, ?, ?, NOW())`,
        ["broadcast", title, message, targetAudience]
      );
      console.log("Broadcast notification inserted successfully");
    } catch (err) {
      console.error("Failed to insert broadcast notification:", err);
      return NextResponse.json(
        { error: `Failed to insert broadcast notification: ${(err as any).message}` },
        { status: 500 }
      );
    }

    // Also log the broadcast
    await pool.query(
      `INSERT INTO broadcast_logs (admin_id, target_audience, title, message, recipients_count, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [userId, normalizedAudience, title, message, targetUsers.length]
    ).catch(() => {
      // Table might not exist, continue anyway
    });

    // Return success - notification will be delivered based on target_audience filtering
    // targetUsers.length is just for reference, actual delivery happens on retrieval
    return NextResponse.json(
      { 
        success: true, 
        message: `Broadcast notification created for ${normalizedAudience} users`, 
        recipients_count: targetUsers.length > 0 ? targetUsers.length : "targeting all in audience" 
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Broadcast error:", error);
    return NextResponse.json({ error: error.message || "Failed to send broadcast" }, { status: 500 });
  }
}
