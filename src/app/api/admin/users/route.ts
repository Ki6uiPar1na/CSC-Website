import { NextResponse, NextRequest } from "next/server";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";
import { checkAdminRole } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  try {
    const auth = await checkAdminRole([1]); // Admin only
    if (!auth.authorized) return auth.response;

    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") || "";
    const status = searchParams.get("status") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "15");
    const offset = (page - 1) * limit;

    let whereClause = "";
    const queryParams: any[] = [];

    const conditions = [];
    if (search) {
      conditions.push("(u.username LIKE ? OR u.email LIKE ?)");
      queryParams.push(`%${search}%`, `%${search}%`);
    }
    if (role) {
      conditions.push("u.role_id = ?");
      queryParams.push(role);
    }
    if (status) {
      conditions.push("u.status = ?");
      queryParams.push(status);
    }

    if (conditions.length > 0) {
      whereClause = "WHERE " + conditions.join(" AND ");
    }

    // Get total count for pagination
    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM users u ${whereClause}`,
      queryParams
    );
    const totalCount = Number(countRows[0].total);
    const totalPages = Math.ceil(totalCount / limit);

    // Get users with their premium status
    // Use a subquery to avoid complex GROUP BY issues with pagination
    const [users] = await pool.query<RowDataPacket[]>(
      `SELECT 
        u.id,
        u.username,
        u.email,
        u.role_id,
        u.status,
        u.total_points,
        u.current_streak,
        u.created_at,
        (SELECT CASE 
          WHEN MAX(uc.id) IS NOT NULL AND MAX(uc.is_active) = TRUE AND (MAX(uc.expires_at) > NOW() OR MAX(uc.expires_at) IS NULL) THEN TRUE 
          ELSE FALSE 
        END FROM upgrade_codes uc WHERE uc.used_by_user_id = u.id) as is_premium,
        (SELECT MAX(uc.code) FROM upgrade_codes uc WHERE uc.used_by_user_id = u.id AND uc.is_active = TRUE) as premium_code,
        (SELECT MAX(uc.expires_at) FROM upgrade_codes uc WHERE uc.used_by_user_id = u.id AND uc.is_active = TRUE) as code_expires_at
       FROM users u
       ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );

    return NextResponse.json({
      users: users,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages
      }
    });
  } catch (error: any) {
    console.error("Get Users Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await checkAdminRole([1]); // Admin only
    if (!auth.authorized) return auth.response;

    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    // Revoke premium by deleting/deactivating upgrade codes
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Mark all active upgrade codes for this user as inactive
      await connection.query(
        `UPDATE upgrade_codes SET is_active = FALSE WHERE used_by_user_id = ? AND is_active = TRUE`,
        [userId]
      );

      await connection.commit();

      // Fetch updated users list
      const [users] = await connection.query<RowDataPacket[]>(
        `SELECT 
          u.id,
          u.username,
          u.email,
          u.role_id,
          u.total_points,
          u.current_streak,
          u.created_at,
          (SELECT CASE 
            WHEN MAX(uc.id) IS NOT NULL AND MAX(uc.is_active) = TRUE AND (MAX(uc.expires_at) > NOW() OR MAX(uc.expires_at) IS NULL) THEN TRUE 
            ELSE FALSE 
          END FROM upgrade_codes uc WHERE uc.used_by_user_id = u.id) as is_premium,
          (SELECT MAX(uc.code) FROM upgrade_codes uc WHERE uc.used_by_user_id = u.id AND uc.is_active = TRUE) as premium_code,
          (SELECT MAX(uc.expires_at) FROM upgrade_codes uc WHERE uc.used_by_user_id = u.id AND uc.is_active = TRUE) as code_expires_at
         FROM users u
         ORDER BY u.created_at DESC`
      );

      connection.release();

      return NextResponse.json({
        success: true,
        message: "Premium access revoked successfully",
        users: users
      });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error: any) {
    console.error("Revoke Premium Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to revoke premium" },
      { status: 500 }
    );
  }
}
