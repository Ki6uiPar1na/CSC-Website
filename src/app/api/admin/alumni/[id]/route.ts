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
      graduation_year,
      session,
      role_title,
      bio,
      photo_url,
      achievements,
      social_links,
    } = await request.json();

    if (!name || !graduation_year) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    await pool.query(
      `UPDATE alumni SET name=?, graduation_year=?, session=?, role_title=?, bio=?, photo_url=?, achievements=?, social_links=?, updated_at=NOW()
       WHERE id=?`,
      [name, graduation_year, session || '2021-2022', role_title || null, bio || null, photo_url || null, achievements || null, social_links || null, id]
    );

    return NextResponse.json({
      message: "Alumni updated successfully",
    });
  } catch (error: any) {
    console.error("Update Alumni Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update alumni" },
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

    await pool.query(`DELETE FROM alumni WHERE id=?`, [id]);

    return NextResponse.json({
      message: "Alumni deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete Alumni Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete alumni" },
      { status: 500 }
    );
  }
}
