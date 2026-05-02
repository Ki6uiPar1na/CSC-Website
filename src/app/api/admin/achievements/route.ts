import { NextRequest, NextResponse } from "next/server";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";
import { checkAdminRole } from "@/lib/admin-auth";

export async function GET() {
  try {
    const auth = await checkAdminRole([1, 2]); // Admin and Instructor
    if (!auth.authorized) return auth.response;

    const [result] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM competition_achievements ORDER BY achievement_date DESC"
    );
    return NextResponse.json({ achievements: result });
  } catch (error) {
    console.error("Error fetching achievements:", error);
    return NextResponse.json(
      { error: "Failed to fetch achievements" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await checkAdminRole([1, 2]); // Admin and Instructor
    if (!auth.authorized) return auth.response;

    const body = await req.json();
    const {
      competition_name,
      contest_name,
      team_name,
      team_members,
      is_team_contest,
      position,
      prize_money,
      description,
      gallery_images,
      achievement_date,
    } = body;

    if (!competition_name) {
      return NextResponse.json(
        { error: "Competition name is required" },
        { status: 400 }
      );
    }

    const result = await pool.query(
      "INSERT INTO competition_achievements (competition_name, contest_name, team_name, team_members, is_team_contest, position, prize_money, description, gallery_images, achievement_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        competition_name,
        contest_name || competition_name,
        team_name || null,
        team_members || null,
        is_team_contest === undefined ? 1 : is_team_contest,
        position || null,
        prize_money || null,
        description || null,
        gallery_images || null,
        achievement_date || null,
      ]
    );

    return NextResponse.json(
      { id: (result as any)[0].insertId, competition_name },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating achievement:", error);
    return NextResponse.json(
      { error: "Failed to create achievement" },
      { status: 500 }
    );
  }
}
