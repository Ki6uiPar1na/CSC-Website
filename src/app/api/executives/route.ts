import { NextRequest, NextResponse } from "next/server";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";
import { withCache, CACHE_KEYS, CACHE_TTL, cacheManager } from "@/lib/cache";

export async function GET() {
  try {
    const result = await withCache(
      CACHE_KEYS.EXECUTIVES,
      async () => {
        const [data] = await pool.query<RowDataPacket[]>(
          "SELECT * FROM executives ORDER BY id ASC"
        );
        return data;
      },
      CACHE_TTL.VERY_LONG
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

    // Invalidate cache on new entry
    cacheManager.invalidateNamespace(CACHE_KEYS.EXECUTIVES);

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
