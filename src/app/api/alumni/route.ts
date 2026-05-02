import { NextRequest, NextResponse } from "next/server";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";
import { withCache, CACHE_KEYS, CACHE_TTL, cacheManager } from "@/lib/cache";

export async function GET() {
  try {
    const result = await withCache(
      CACHE_KEYS.ALUMNI,
      async () => {
        const [data] = await pool.query<RowDataPacket[]>(
          "SELECT * FROM alumni ORDER BY graduation_year DESC, name ASC"
        );
        return data;
      },
      CACHE_TTL.VERY_LONG
    );
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching alumni:", error);
    return NextResponse.json(
      { error: "Failed to fetch alumni" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      graduation_year,
      session,
      role_title,
      bio,
      photo_url,
      achievements,
    } = body;

    if (!name || !graduation_year) {
      return NextResponse.json(
        { error: "Name and graduation year are required" },
        { status: 400 }
      );
    }

    const result = await pool.query(
      "INSERT INTO alumni (name, graduation_year, session, role_title, bio, photo_url, achievements) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        name,
        graduation_year,
        session || '2021-2022',
        role_title || null,
        bio || null,
        photo_url || null,
        achievements || null,
      ]
    );

    // Invalidate cache on new entry
    cacheManager.invalidateNamespace(CACHE_KEYS.ALUMNI);

    return NextResponse.json(
      { id: (result as any)[0].insertId, name, graduation_year },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating alumni entry:", error);
    return NextResponse.json(
      { error: "Failed to create alumni entry" },
      { status: 500 }
    );
  }
}
