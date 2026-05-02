import { NextRequest, NextResponse } from "next/server";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";

export async function GET() {
  try {
    const [result] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM contests ORDER BY event_date DESC"
    );
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching contests:", error);
    return NextResponse.json(
      { error: "Failed to fetch contests" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, event_date, winners, photo_url, details } =
      body;

    if (!name) {
      return NextResponse.json(
        { error: "Contest name is required" },
        { status: 400 }
      );
    }

    const result = await pool.query(
      "INSERT INTO contests (name, description, event_date, winners, photo_url, details) VALUES (?, ?, ?, ?, ?, ?)",
      [
        name,
        description || null,
        event_date || null,
        winners ? JSON.stringify(winners) : null,
        photo_url || null,
        details || null,
      ]
    );

    return NextResponse.json(
      { id: (result as any)[0].insertId, name },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating contest:", error);
    return NextResponse.json(
      { error: "Failed to create contest" },
      { status: 500 }
    );
  }
}
