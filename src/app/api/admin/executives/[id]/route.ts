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
      role,
      bio,
      photo_url,
      year_joined,
      session,
      social_links,
    } = await request.json();

    if (!name || !role || !session) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    await pool.query(
      `UPDATE executives SET name=?, role=?, bio=?, photo_url=?, year_joined=?, session=?, social_links=?, updated_at=NOW()
       WHERE id=?`,
      [name, role, bio || null, photo_url || null, year_joined || null, session, social_links || null, id]
    );

    return NextResponse.json({
      message: "Executive updated successfully",
    });
  } catch (error: any) {
    console.error("Update Executive Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update executive" },
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

    await pool.query(`DELETE FROM executives WHERE id=?`, [id]);

    return NextResponse.json({
      message: "Executive deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete Executive Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete executive" },
      { status: 500 }
    );
  }
}
