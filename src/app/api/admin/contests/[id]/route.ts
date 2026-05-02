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

    const {
      name,
      description,
      event_date,
      winners,
      photo_url,
      details,
    } = await request.json();

    if (!name || !event_date) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    await pool.query(
      `UPDATE contests SET name=?, description=?, event_date=?, winners=?, photo_url=?, details=?, updated_at=NOW()
       WHERE id=?`,
      [name, description || null, event_date, winners || null, photo_url || null, details || null, id]
    );

    return NextResponse.json({
      message: "Contest updated successfully",
    });
  } catch (error: any) {
    console.error("Update Contest Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update contest" },
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

    await pool.query(`DELETE FROM contests WHERE id=?`, [id]);

    return NextResponse.json({
      message: "Contest deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete Contest Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete contest" },
      { status: 500 }
    );
  }
}
