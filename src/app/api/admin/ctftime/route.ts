import { NextResponse, NextRequest } from "next/server";
import { checkAdminRole } from "@/lib/admin-auth";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";

export async function GET(req: NextRequest) {
  try {
    const auth = await checkAdminRole([1, 2]);
    if (!auth.authorized) return auth.response;

    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50");
    const start = searchParams.get("start");
    const finish = searchParams.get("finish");

    const now = Math.floor(Date.now() / 1000);
    const startTs = start ? parseInt(start) : now;
    const finishTs = finish ? parseInt(finish) : now + 90 * 24 * 60 * 60;

    const res = await fetch(
      `https://ctftime.org/api/v1/events/?limit=${limit}&start=${startTs}&finish=${finishTs}`,
      {
        headers: { "User-Agent": "JKKNIU-CSC/1.0" },
        next: { revalidate: 300 },
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

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT c.id as contest_id, c.ctftime_event_id, c.team_id, t.name as team_name
       FROM contests c
       LEFT JOIN teams t ON c.team_id = t.id
       WHERE c.ctftime_event_id IS NOT NULL`
    );

    const importedMap = new Map<number, { contest_id: number; team_id: number | null; team_name: string | null }[]>();
    for (const row of rows) {
      const eid = row.ctftime_event_id;
      if (!importedMap.has(eid)) {
        importedMap.set(eid, []);
      }
      importedMap.get(eid)!.push({
        contest_id: row.contest_id,
        team_id: row.team_id,
        team_name: row.team_name,
      });
    }

    const [teams] = await pool.query<RowDataPacket[]>(
      `SELECT id, name FROM teams ORDER BY name`
    );

    const mappedEvents = events.map((event: any) => {
      const eid = event.id;
      const imports = importedMap.get(eid) || [];
      return {
        ctftime_id: eid,
        title: event.title,
        description: event.description,
        start: event.start,
        finish: event.finish,
        url: event.url,
        format: event.format,
        weight: event.weight,
        already_imported: imports.length > 0,
        contests: imports,
      };
    });

    return NextResponse.json({
      events: mappedEvents,
      teams: teams.map((t: any) => ({ id: t.id, name: t.name })),
    });
  } catch (error: any) {
    console.error("CTFtime API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch events" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await checkAdminRole([1, 2]);
    if (!auth.authorized) return auth.response;

    const body = await req.json();
    const { ctftime_event_id, team_id, name, description, start_date, url } = body;

    if (!ctftime_event_id || !team_id) {
      return NextResponse.json(
        { error: "ctftime_event_id and team_id are required" },
        { status: 400 }
      );
    }

    const eventDate = start_date
      ? new Date(start_date).toISOString().slice(0, 19).replace("T", " ")
      : null;

    const [existing] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM contests WHERE ctftime_event_id = ? AND team_id = ?`,
      [ctftime_event_id, team_id]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "This event is already assigned to this team" },
        { status: 409 }
      );
    }

    const [result] = await pool.query(
      `INSERT INTO contests (name, description, event_date, details, team_id, ctftime_event_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        name || "Untitled Event",
        description || null,
        eventDate,
        url || null,
        team_id || null,
        ctftime_event_id,
      ]
    );

    return NextResponse.json({
      message: "Contest imported and assigned to team",
      contest_id: (result as any).insertId,
    });
  } catch (error: any) {
    console.error("Import CTFtime Event Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to import event" },
      { status: 500 }
    );
  }
}
