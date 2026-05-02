import { NextRequest, NextResponse } from "next/server";
import pool from "@/models/db";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, graduation_year, session, role_title, bio, photo_url, achievements, social_links } = body;

    if (!name || !graduation_year) {
      return NextResponse.json(
        { error: "Name and graduation year are required" },
        { status: 400 }
      );
    }

    await pool.query(
      "UPDATE alumni SET name = ?, graduation_year = ?, session = ?, role_title = ?, bio = ?, photo_url = ?, achievements = ?, social_links = ? WHERE id = ?",
      [
        name,
        graduation_year,
        session || '2021-2022',
        role_title || null,
        bio || null,
        photo_url || null,
        achievements || null,
        social_links || null,
        id
      ]
    );

    return NextResponse.json({ message: "Alumni updated successfully" });
  } catch (error) {
    console.error("Error updating alumni:", error);
    return NextResponse.json(
      { error: "Failed to update alumni" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await pool.query("DELETE FROM alumni WHERE id = ?", [id]);

    return NextResponse.json({ message: "Alumni deleted successfully" });
  } catch (error) {
    console.error("Error deleting alumni:", error);
    return NextResponse.json(
      { error: "Failed to delete alumni" },
      { status: 500 }
    );
  }
}
