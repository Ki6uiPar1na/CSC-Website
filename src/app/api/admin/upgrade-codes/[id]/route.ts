import { NextResponse } from "next/server";
import { checkAdminRole } from "@/lib/admin-auth";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAdminRole([1]);
    if (!auth.authorized) return auth.response;

    const resolvedParams = await params;
    const codeId = parseInt(resolvedParams.id);
    if (isNaN(codeId)) {
      return NextResponse.json({ error: "Invalid code ID" }, { status: 400 });
    }

    // Check if code exists
    const [existingCode] = await pool.query<RowDataPacket[]>(
      `SELECT id, used_by_user_id FROM upgrade_codes WHERE id = ?`,
      [codeId]
    );

    if (existingCode.length === 0) {
      return NextResponse.json({ error: "Code not found" }, { status: 404 });
    }

    const usedByUserId = existingCode[0].used_by_user_id;

    console.log(`Deleting code ID ${codeId}, previously used by user: ${usedByUserId}`);

    // Soft delete: mark as inactive and set deleted_at timestamp
    // When code is deleted, user automatically loses premium status
    // (Premium is determined by having an ACTIVE code, not by subscription fields)
    await pool.query(
      `UPDATE upgrade_codes SET is_active = FALSE, deleted_at = NOW() WHERE id = ?`,
      [codeId]
    );

    console.log(`Code ${codeId} soft deleted. Users who had this code will no longer be premium.`);

    // Fetch updated codes and stats (only active codes)
    const [allCodes] = await pool.query<RowDataPacket[]>(
      `SELECT id, code, validity_months, created_by_admin_id, created_at, expires_at, is_used, used_by_user_id, used_at, is_reusable, is_active, deleted_at 
       FROM upgrade_codes 
       WHERE is_active = TRUE
       ORDER BY created_at DESC 
       LIMIT 100`
    );

    const [stats] = await pool.query<RowDataPacket[]>(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_used = FALSE THEN 1 ELSE 0 END) as unused,
        SUM(CASE WHEN is_used = TRUE THEN 1 ELSE 0 END) as used
       FROM upgrade_codes WHERE is_active = TRUE`
    );

    return NextResponse.json(
      {
        success: true,
        message: "Code deleted successfully. Users with this code are no longer premium.",
        codes: allCodes,
        stats: stats[0],
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Delete Upgrade Code Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete code" },
      { status: 500 }
    );
  }
}
