import { NextResponse, NextRequest } from "next/server";
import { checkAdminRole } from "@/lib/admin-auth";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";

export async function POST(
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

    // Get the active upgrade code for this user
    const [codeRows] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM upgrade_codes WHERE used_by_user_id = ? AND is_active = TRUE LIMIT 1`,
      [userId]
    );

    if (codeRows.length === 0) {
      return NextResponse.json(
        { error: "User has no active premium code to revoke" },
        { status: 400 }
      );
    }

    const codeId = codeRows[0].id;

    // Deactivate the upgrade code
    await pool.query(
      `UPDATE upgrade_codes SET is_active = FALSE WHERE id = ?`,
      [codeId]
    );

    return NextResponse.json({
      message: "Premium status revoked successfully",
      codeId,
    });
  } catch (error: any) {
    console.error("Revoke Premium Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to revoke premium" },
      { status: 500 }
    );
  }
}
