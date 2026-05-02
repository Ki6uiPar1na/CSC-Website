import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";
import { verifyCaptcha } from "@/lib/captcha-utils";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = "id" in session.user ? parseInt((session.user as any).id) : null;
    if (!userId) {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }

    const body = await req.json();
    const { code } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Invalid code format" }, { status: 400 });
    }

    // Find the upgrade code
    const [codeRows] = await pool.query<RowDataPacket[]>(
      `SELECT id, validity_months, is_used, is_reusable, expires_at, usage_limit, usage_count 
       FROM upgrade_codes 
       WHERE code = ? AND is_active = TRUE`,
      [code.trim()]
    );

    if (codeRows.length === 0) {
      return NextResponse.json({ error: "Invalid upgrade code" }, { status: 400 });
    }

    const upgradeCode = codeRows[0];

    // Check if user has already used THIS specific code
    const [usageRows] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM upgrade_code_usage WHERE upgrade_code_id = ? AND user_id = ?`,
      [upgradeCode.id, userId]
    );

    if (usageRows.length > 0) {
      return NextResponse.json({ error: "You have already used this upgrade code" }, { status: 400 });
    }

    // Check if code is already fully used
    if (upgradeCode.is_used || (upgradeCode.usage_limit > 1 && upgradeCode.usage_count >= upgradeCode.usage_limit)) {
      return NextResponse.json({ error: "This code has already reached its usage limit" }, { status: 400 });
    }

    // Check if code has expired
    if (upgradeCode.expires_at && new Date(upgradeCode.expires_at) < new Date()) {
      return NextResponse.json({ error: "This upgrade code has expired" }, { status: 400 });
    }

    // Calculate subscription expiry date
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + upgradeCode.validity_months);

    // Begin transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Increment usage count
      await connection.query(
        `UPDATE upgrade_codes 
         SET usage_count = usage_count + 1,
             is_used = CASE WHEN usage_count + 1 >= usage_limit THEN TRUE ELSE is_used END,
             used_by_user_id = CASE WHEN used_by_user_id IS NULL THEN ? ELSE used_by_user_id END,
             used_at = CASE WHEN used_at IS NULL THEN NOW() ELSE used_at END
         WHERE id = ?`,
        [userId, upgradeCode.id]
      );

      // Track usage in junction table
      await connection.query(
        `INSERT INTO upgrade_code_usage (upgrade_code_id, user_id, used_at) 
         VALUES (?, ?, NOW())`,
        [upgradeCode.id, userId]
      );

      await connection.commit();
      connection.release();

      return NextResponse.json(
        {
          success: true,
          message: `Account upgraded successfully! Premium access for ${upgradeCode.validity_months} month(s)`,
          expiresAt: expiryDate,
        },
        { status: 200 }
      );
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error: any) {
    console.error("Upgrade API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upgrade account" },
      { status: 500 }
    );
  }
}
