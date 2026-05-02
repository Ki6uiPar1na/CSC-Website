import { NextRequest, NextResponse } from "next/server";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";

export async function GET() {
  try {
    const [result] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM executives ORDER BY id ASC"
    );
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching executives:", error);
    return NextResponse.json(
      { error: "Failed to fetch executives" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, role, bio, photo_url, year_joined, session } = body;

    if (!name || !role) {
      return NextResponse.json(
        { error: "Name and role are required" },
        { status: 400 }
      );
    }

    const result = await pool.query(
      "INSERT INTO executives (name, role, bio, photo_url, year_joined, session) VALUES (?, ?, ?, ?, ?, ?)",
      [name, role, bio || null, photo_url || null, year_joined || null, session || "2026-2027"]
    );

    return NextResponse.json(
      { id: (result as any)[0].insertId, name, role },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating executive:", error);
    return NextResponse.json(
      { error: "Failed to create executive" },
      { status: 500 }
    );
  }
}
