import { NextResponse, NextRequest } from "next/server";
import { checkAdminRole } from "@/lib/admin-auth";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const auth = await checkAdminRole([1]);
    if (!auth.authorized) return auth.response;

    const adminId = auth.userId;

    const userId = parseInt(id);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    // Prevent admin from deleting themselves
    if (userId === adminId) {
      return NextResponse.json(
        { error: "You cannot delete yourself" },
        { status: 400 }
      );
    }

    // Check if user exists
    const [userRows] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM users WHERE id = ?`,
      [userId]
    );

    if (userRows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Delete user and all related data
    // First, deactivate their upgrade codes
    await pool.query(
      `UPDATE upgrade_codes SET is_active = FALSE WHERE used_by_user_id = ?`,
      [userId]
    );

    // Delete user solves (if table exists)
    try {
      await pool.query(
        `DELETE FROM solves WHERE user_id = ?`,
        [userId]
      );
    } catch (error) {
      // Table might not exist, continue
      console.log("solves table not found, skipping");
    }

    // Delete the user
    await pool.query(
      `DELETE FROM users WHERE id = ?`,
      [userId]
    );

    console.log(`Admin ${adminId} deleted user ${userId}`);

    return NextResponse.json({
      message: "User deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete User Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete user" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { roleId, status } = body;
    
    const auth = await checkAdminRole([1]);
    if (!auth.authorized) return auth.response;

    const adminId = auth.userId;

    const userId = parseInt(id);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    // Prevent admin from changing their own role/status
    if (userId === adminId) {
      return NextResponse.json(
        { error: "You cannot change your own role or status" },
        { status: 400 }
      );
    }

    // Prepare update query
    let updateFields = [];
    let queryParams = [];

    if (roleId !== undefined) {
      // Check if role exists
      const [roleRows] = await pool.query<RowDataPacket[]>(
        `SELECT role_id FROM roles WHERE role_id = ?`,
        [roleId]
      );
      if (roleRows.length === 0) {
        return NextResponse.json({ error: "Invalid role ID" }, { status: 400 });
      }
      updateFields.push("role_id = ?");
      queryParams.push(roleId);
    }

    if (status !== undefined) {
      if (!['pending', 'approved', 'rejected'].includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      updateFields.push("status = ?");
      queryParams.push(status);
    }

    if (updateFields.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    queryParams.push(userId);
    await pool.query(
      `UPDATE users SET ${updateFields.join(", ")} WHERE id = ?`,
      queryParams
    );

    console.log(`Admin ${adminId} updated user ${userId}: ${updateFields.join(", ")}`);

    return NextResponse.json({
      message: "User updated successfully",
    });
  } catch (error: any) {
    console.error("Update User Role Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update user role" },
      { status: 500 }
    );
  }
}
