import { NextResponse, NextRequest } from "next/server";
import { checkAdminRole } from "@/lib/admin-auth";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";

export async function GET() {
  try {
    const auth = await checkAdminRole([1, 2]);
    if (!auth.authorized) return auth.response;

    const [teams] = await pool.query<RowDataPacket[]>(
      `SELECT t.*, (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count
       FROM teams t ORDER BY t.created_at DESC`
    );

    return NextResponse.json({ teams });
  } catch (error: any) {
    console.error("Get Teams Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch teams" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await checkAdminRole([1]);
    if (!auth.authorized) return auth.response;

    const { name, description, ctftime_team_id, ctftime_logo, ctftime_country, ctftime_primary_alias, ctftime_rating, ctftime_members } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Team name is required" },
        { status: 400 }
      );
    }

    const [result] = await pool.query(
      `INSERT INTO teams (name, description, ctftime_team_id, ctftime_logo, ctftime_country, ctftime_primary_alias, ctftime_rating, ctftime_members, ctftime_last_fetched) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name.trim(), description || null, ctftime_team_id || null, ctftime_logo || null, ctftime_country || null, ctftime_primary_alias || null, ctftime_rating ? JSON.stringify(ctftime_rating) : null, ctftime_members ? JSON.stringify(ctftime_members) : null, ctftime_logo ? new Date() : null]
    );

    return NextResponse.json({
      message: "Team created successfully",
      team_id: (result as any).insertId,
    });
  } catch (error: any) {
    console.error("Create Team Error:", error);
    if (error.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { error: "A team with this name already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to create team" },
      { status: 500 }
    );
  }
}
