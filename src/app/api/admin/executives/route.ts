import { NextResponse, NextRequest } from "next/server";
import { checkAdminRole } from "@/lib/admin-auth";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";

export async function GET() {
  try {
    const auth = await checkAdminRole([1, 2]);
    if (!auth.authorized) return auth.response;

    const [executives] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM executives ORDER BY session DESC, role ASC`
    );

    return NextResponse.json({ executives });
  } catch (error: any) {
    console.error("Get Executives Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch executives" },
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

    const [result] = await pool.query(
      `INSERT INTO executives (name, role, bio, photo_url, year_joined, session, social_links)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, role, bio || null, photo_url || null, year_joined || null, session, social_links || null]
    );

    return NextResponse.json({
      message: "Executive created successfully",
      executive_id: (result as any).insertId,
    });
  } catch (error: any) {
    console.error("Create Executive Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create executive" },
      { status: 500 }
    );
  }
}
