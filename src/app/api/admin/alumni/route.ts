import { NextResponse, NextRequest } from "next/server";
import { checkAdminRole } from "@/lib/admin-auth";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";

export async function GET() {
  try {
    const auth = await checkAdminRole([1, 2]);
    if (!auth.authorized) return auth.response;

    const [alumni] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM alumni ORDER BY graduation_year DESC, name ASC`
    );

    return NextResponse.json({ alumni });
  } catch (error: any) {
    console.error("Get Alumni Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch alumni" },
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

    const [result] = await pool.query(
      `INSERT INTO alumni (name, graduation_year, session, role_title, bio, photo_url, achievements, social_links)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, graduation_year, session || '2021-2022', role_title || null, bio || null, photo_url || null, achievements || null, social_links || null]
    );

    return NextResponse.json({
      message: "Alumni created successfully",
      alumni_id: (result as any).insertId,
    });
  } catch (error: any) {
    console.error("Create Alumni Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create alumni" },
      { status: 500 }
    );
  }
}
