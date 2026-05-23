import { NextResponse } from "next/server";
import { checkAdminRole } from "@/lib/admin-auth";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";

export async function GET() {
  try {
    const auth = await checkAdminRole([1, 2]);
    if (!auth.authorized) return auth.response;

    const [users] = await pool.query<RowDataPacket[]>(
      `SELECT id, username, email FROM users WHERE status = 'approved' ORDER BY username ASC`
    );

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error("Get Simple Users Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch users" },
      { status: 500 }
    );
  }
}
