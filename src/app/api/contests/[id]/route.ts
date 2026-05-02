import { NextRequest, NextResponse } from "next/server";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM contests WHERE id = ?",
      [id]
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: "Contest not found" }, { status: 404 });
    }
    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error("Error fetching contest:", error);
    return NextResponse.json({ error: "Failed to fetch contest" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, description, event_date, winners, photo_url, details } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Contest name is required" },
        { status: 400 }
      );
    }

    await pool.query(
      "UPDATE contests SET name = ?, description = ?, event_date = ?, winners = ?, photo_url = ?, details = ? WHERE id = ?",
      [
        name,
        description || null,
        event_date || null,
        winners ? JSON.stringify(winners) : null,
        photo_url || null,
        details || null,
        id
      ]
    );

    return NextResponse.json({ message: "Contest updated successfully" });
  } catch (error) {
    console.error("Error updating contest:", error);
    return NextResponse.json(
      { error: "Failed to update contest" },
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

    await pool.query("DELETE FROM contests WHERE id = ?", [id]);

    return NextResponse.json({ message: "Contest deleted successfully" });
  } catch (error) {
    console.error("Error deleting contest:", error);
    return NextResponse.json(
      { error: "Failed to delete contest" },
      { status: 500 }
    );
  }
}
