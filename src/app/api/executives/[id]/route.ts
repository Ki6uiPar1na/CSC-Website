import { NextRequest, NextResponse } from "next/server";
import pool from "@/models/db";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, role, bio, photo_url, year_joined, session, social_links } = body;

    if (!name || !role) {
      return NextResponse.json(
        { error: "Name and role are required" },
        { status: 400 }
      );
    }

    await pool.query(
      "UPDATE executives SET name = ?, role = ?, bio = ?, photo_url = ?, year_joined = ?, session = ?, social_links = ? WHERE id = ?",
      [name, role, bio || null, photo_url || null, year_joined || null, session || "2026-2027", social_links || null, id]
    );

    return NextResponse.json({ message: "Executive updated successfully" });
  } catch (error) {
    console.error("Error updating executive:", error);
    return NextResponse.json(
      { error: "Failed to update executive" },
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

    await pool.query("DELETE FROM executives WHERE id = ?", [id]);

    return NextResponse.json({ message: "Executive deleted successfully" });
  } catch (error) {
    console.error("Error deleting executive:", error);
    return NextResponse.json(
      { error: "Failed to delete executive" },
      { status: 500 }
    );
  }
}
