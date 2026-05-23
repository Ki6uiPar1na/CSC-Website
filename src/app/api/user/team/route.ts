import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    const [teams] = await pool.query<RowDataPacket[]>(
      `SELECT t.id, t.name, t.description, t.ctftime_team_id, t.ctftime_logo, t.ctftime_country, t.ctftime_primary_alias, t.ctftime_rating, t.ctftime_last_fetched, t.ctftime_members
       FROM teams t
       JOIN team_members tm ON tm.team_id = t.id
       WHERE tm.user_id = ?
       LIMIT 1`,
      [userId]
    );

    if (teams.length === 0) {
      return NextResponse.json({ team: null });
    }

    const team = teams[0];

    const [members] = await pool.query<RowDataPacket[]>(
      `SELECT u.id, u.username, u.email
       FROM team_members tm
       JOIN users u ON u.id = tm.user_id
       WHERE tm.team_id = ?
       ORDER BY u.username ASC`,
      [team.id]
    );

    const [contests] = await pool.query<RowDataPacket[]>(
      `SELECT id, name, description, event_date, winners, details, ctftime_event_id
       FROM contests
       WHERE team_id = ?
       ORDER BY event_date DESC`,
      [team.id]
    );

    return NextResponse.json({
      team: {
        id: team.id,
        name: team.name,
        description: team.description,
        ctftime_team_id: team.ctftime_team_id,
        ctftime_logo: team.ctftime_logo,
        ctftime_country: team.ctftime_country,
        ctftime_primary_alias: team.ctftime_primary_alias,
        ctftime_rating: team.ctftime_rating,
        ctftime_last_fetched: team.ctftime_last_fetched,
        ctftime_members: team.ctftime_members,
        members,
        contests,
      },
    });
  } catch (error: any) {
    console.error("Get User Team Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch team" },
      { status: 500 }
    );
  }
}
