import { NextRequest, NextResponse } from "next/server";
import pool from "@/models/db";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
      achievement_date,
    } = body;

    if (!competition_name || !contest_name) {
      return NextResponse.json(
        { error: "Competition name and contest name are required" },
        { status: 400 }
      );
    }

    await pool.query(
      "UPDATE competition_achievements SET competition_name = ?, contest_name = ?, team_name = ?, team_members = ?, is_team_contest = ?, position = ?, prize_money = ?, description = ?, achievement_date = ? WHERE id = ?",
      [
        competition_name,
        contest_name,
        team_name || null,
        team_members || null,
        is_team_contest === undefined ? 1 : is_team_contest,
        position || null,
        prize_money || null,
        description || null,
        achievement_date || null,
        id,
      ]
    );

    return NextResponse.json({ message: "Achievement updated successfully" });
  } catch (error) {
    console.error("Error updating achievement:", error);
    return NextResponse.json(
      { error: "Failed to update achievement" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await pool.query("DELETE FROM competition_achievements WHERE id = ?", [id]);
    return NextResponse.json({ message: "Achievement deleted successfully" });
  } catch (error) {
    console.error("Error deleting achievement:", error);
    return NextResponse.json(
      { error: "Failed to delete achievement" },
      { status: 500 }
    );
  }
}
