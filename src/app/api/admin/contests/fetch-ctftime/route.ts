import { NextResponse } from "next/server";
import { checkAdminRole } from "@/lib/admin-auth";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";

export async function POST() {
  try {
    const auth = await checkAdminRole([1]);
    if (!auth.authorized) return auth.response;

    const now = Math.floor(Date.now() / 1000);
    const threeMonthsAgo = now - 90 * 24 * 60 * 60;
    const oneMonthLater = now + 30 * 24 * 60 * 60;

    const res = await fetch(
      `https://ctftime.org/api/v1/events/?limit=50&start=${threeMonthsAgo}&finish=${oneMonthLater}`,
      {
        headers: {
          "User-Agent": "JKKNIU-CSC/1.0",
        },
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: `CTFtime API returned ${res.status}` },
        { status: 502 }
      );
    }

    const events = await res.json();

    if (!Array.isArray(events)) {
      return NextResponse.json(
        { error: "Invalid response from CTFtime API" },
        { status: 502 }
      );
    }

    const [existing] = await pool.query<RowDataPacket[]>(
      `SELECT ctftime_event_id FROM contests WHERE ctftime_event_id IS NOT NULL`
    );
    const existingIds = new Set(existing.map((r: any) => r.ctftime_event_id));

    let imported = 0;
    let skipped = 0;

    for (const event of events) {
      if (existingIds.has(event.id)) {
        skipped++;
        continue;
      }

      const startDate = event.start ? new Date(event.start).toISOString().slice(0, 19).replace("T", " ") : null;

      await pool.query(
        `INSERT INTO contests (name, description, event_date, details, ctftime_event_id)
         VALUES (?, ?, ?, ?, ?)`,
        [
          event.title || "Untitled Event",
          event.description || null,
          startDate,
          event.url || null,
          event.id,
        ]
      );
      imported++;
    }

    return NextResponse.json({
      message: `Imported ${imported} contest(s) from CTFtime (${skipped} already exist)`,
      imported,
      skipped,
    });
  } catch (error: any) {
    console.error("Fetch CTFtime Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch from CTFtime" },
      { status: 500 }
    );
  }
}
