import { NextRequest, NextResponse } from "next/server";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";
import { checkAdminRole } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  try {
    const auth = await checkAdminRole([1, 2]);
    if (!auth.authorized) return auth.response;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "15");
    const offset = (page - 1) * limit;

    const [countResult] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) as total FROM competition_achievements"
    );
    const total = (countResult[0] as any).total;

    const [result] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM competition_achievements ORDER BY achievement_date DESC LIMIT ? OFFSET ?",
      [limit, offset]
    );
    return NextResponse.json({
      achievements: result,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
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
