import { NextResponse } from "next/server";
import { checkAdminRole } from "@/lib/admin-auth";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";
import bcrypt from "bcryptjs";

export async function GET(req: Request) {
  try {
    const auth = await checkAdminRole([1]);
    if (!auth.authorized) return auth.response;

    // Get all members
    const [members] = await pool.query<RowDataPacket[]>(
      `SELECT id, username, email, role_id, total_points, current_streak, 
              subscription_status, subscription_expires_at, created_at 
       FROM users ORDER BY created_at DESC`
    );

    return NextResponse.json({ members }, { status: 200 });
  } catch (error: any) {
    console.error("Get Members Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const auth = await checkAdminRole([1]);
    if (!auth.authorized) return auth.response;

    const body = await req.json();
    const { memberId, role_id, subscription_status, subscription_expires_at } = body;

    if (!memberId) return NextResponse.json({ error: "Member ID required" }, { status: 400 });

    // Update member
    const updates = [];
    const values = [];

    if (role_id !== undefined) {
      updates.push("role_id = ?");
      values.push(role_id);
    }
    if (subscription_status !== undefined) {
      updates.push("subscription_status = ?");
      values.push(subscription_status);
    }
    if (subscription_expires_at !== undefined) {
      updates.push("subscription_expires_at = ?");
      values.push(subscription_expires_at);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    values.push(memberId);

    await pool.query(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, values);

    return NextResponse.json({ success: true, message: "Member updated" }, { status: 200 });
  } catch (error: any) {
    console.error("Update Member Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await checkAdminRole([1]);
    if (!auth.authorized) return auth.response;

    const body = await req.json();
    const { memberId, newPassword } = body;

    if (!memberId) return NextResponse.json({ error: "Member ID required" }, { status: 400 });
    if (!newPassword) return NextResponse.json({ error: "New password required" }, { status: 400 });
    if (newPassword.length < 6) return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });

    // Don't allow changing admin passwords
    const [member] = await pool.query<RowDataPacket[]>("SELECT role_id FROM users WHERE id = ?", [memberId]);
    if (member.length === 0) return NextResponse.json({ error: "Member not found" }, { status: 404 });
    if (member[0].role_id === 1) return NextResponse.json({ error: "Cannot change admin passwords" }, { status: 403 });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [hashedPassword, memberId]);

    return NextResponse.json({ success: true, message: "Password reset successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("Reset Password Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await checkAdminRole([1]);
    if (!auth.authorized) return auth.response;

    const userId = auth.userId;

    const body = await req.json();
    const { memberId } = body;

    if (!memberId) return NextResponse.json({ error: "Member ID required" }, { status: 400 });

    // Don't allow deleting admin accounts or yourself
    const [member] = await pool.query<RowDataPacket[]>("SELECT role_id FROM users WHERE id = ?", [memberId]);
    if (member.length === 0) return NextResponse.json({ error: "Member not found" }, { status: 404 });
    if (member[0].role_id === 1) return NextResponse.json({ error: "Cannot delete admin accounts" }, { status: 403 });
    if (memberId === userId) return NextResponse.json({ error: "Cannot delete your own account" }, { status: 403 });

    // Delete member (cascade deletes solves, submissions, etc.)
    await pool.query("DELETE FROM users WHERE id = ?", [memberId]);

    return NextResponse.json({ success: true, message: "Member deleted" }, { status: 200 });
  } catch (error: any) {
    console.error("Delete Member Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
