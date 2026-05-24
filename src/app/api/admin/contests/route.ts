import { NextResponse, NextRequest } from "next/server";
import { checkAdminRole } from "@/lib/admin-auth";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";

export async function GET(request: NextRequest) {
  try {
    const auth = await checkAdminRole([1, 2]);
    if (!auth.authorized) return auth.response;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "15");
    const offset = (page - 1) * limit;

    const [countResult] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) as total FROM contests WHERE ctftime_event_id IS NULL"
    );
    const total = (countResult[0] as any).total;

    const [contests] = await pool.query<RowDataPacket[]>(
      `SELECT c.*, t.name as team_name
       FROM contests c
       LEFT JOIN teams t ON t.id = c.team_id
       WHERE c.ctftime_event_id IS NULL
       ORDER BY c.event_date DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    return NextResponse.json({
      contests,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error("Get Contests Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch contests" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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

    const [result] = await pool.query(
      `INSERT INTO contests (name, description, event_date, winners, photo_url, details)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, description || null, event_date, winners || null, photo_url || null, details || null]
    );

    return NextResponse.json({
      message: "Contest created successfully",
      contest_id: (result as any).insertId,
    });
  } catch (error: any) {
    console.error("Create Contest Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create contest" },
      { status: 500 }
    );
  }
}
