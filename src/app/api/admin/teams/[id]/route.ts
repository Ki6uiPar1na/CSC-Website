import { NextResponse, NextRequest } from "next/server";
import { checkAdminRole } from "@/lib/admin-auth";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await checkAdminRole([1]);
    if (!auth.authorized) return auth.response;

    const { name, description, ctftime_team_id, ctftime_logo, ctftime_country, ctftime_primary_alias, ctftime_rating, ctftime_members } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Team name is required" },
        { status: 400 }
      );
    }

    await pool.query(
      `UPDATE teams SET name=?, description=?, ctftime_team_id=?, ctftime_logo=?, ctftime_country=?, ctftime_primary_alias=?, ctftime_rating=?, ctftime_members=?, ctftime_last_fetched=? WHERE id=?`,
      [name.trim(), description || null, ctftime_team_id || null, ctftime_logo || null, ctftime_country || null, ctftime_primary_alias || null, ctftime_rating ? JSON.stringify(ctftime_rating) : null, ctftime_members ? JSON.stringify(ctftime_members) : null, ctftime_logo ? new Date() : null, id]
    );

    return NextResponse.json({ message: "Team updated successfully" });
  } catch (error: any) {
    console.error("Update Team Error:", error);
    if (error.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { error: "A team with this name already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to update team" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await checkAdminRole([1]);
    if (!auth.authorized) return auth.response;

    await pool.query(`DELETE FROM teams WHERE id=?`, [id]);

    return NextResponse.json({ message: "Team deleted successfully" });
  } catch (error: any) {
    console.error("Delete Team Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete team" },
      { status: 500 }
    );
  }
}
