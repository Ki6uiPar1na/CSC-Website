import { NextResponse, NextRequest } from "next/server";
import { checkAdminRole } from "@/lib/admin-auth";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await checkAdminRole([1, 2]);
    if (!auth.authorized) return auth.response;

    const [members] = await pool.query<RowDataPacket[]>(
      `SELECT tm.*, u.username, u.email
       FROM team_members tm
       JOIN users u ON u.id = tm.user_id
       WHERE tm.team_id = ?
       ORDER BY u.username ASC`,
      [id]
    );

    return NextResponse.json({ members });
  } catch (error: any) {
    console.error("Get Team Members Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch team members" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await checkAdminRole([1]);
    if (!auth.authorized) return auth.response;

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const [existing] = await pool.query<RowDataPacket[]>(
      `SELECT tm.id, t.name as team_name FROM team_members tm JOIN teams t ON t.id = tm.team_id WHERE tm.user_id = ?`,
      [userId]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { error: `User is already a member of "${existing[0].team_name}". Each user can only belong to one team.` },
        { status: 409 }
      );
    }

    await pool.query(
      `INSERT INTO team_members (team_id, user_id) VALUES (?, ?)`,
      [id, userId]
    );

    return NextResponse.json({ message: "Member added successfully" });
  } catch (error: any) {
    console.error("Add Team Member Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to add member" },
      { status: 500 }
    );
  }
}
