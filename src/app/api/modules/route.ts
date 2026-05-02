import { NextResponse } from "next/server";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user && "id" in session.user ? parseInt((session.user as any).id) : null;

    const [modules] = await pool.query<RowDataPacket[]>(
      `SELECT id, title as name, description, is_premium 
       FROM modules 
       ORDER BY created_at DESC`
    );

    // Check module completion status if user is logged in
    if (userId) {
      for (const mod of modules) {
        const [challenges] = await pool.query<RowDataPacket[]>(
          "SELECT id FROM challenges WHERE module_id = ?",
          [mod.id]
        );
        const [solves] = await pool.query<RowDataPacket[]>(
          `SELECT challenge_id FROM solves 
           WHERE user_id = ? AND challenge_id IN (SELECT id FROM challenges WHERE module_id = ?)`,
          [userId, mod.id]
        );
        (mod as any).completed = challenges.length > 0 && challenges.length === solves.length;
      }
    }

    return NextResponse.json(modules);
  } catch (error: any) {
    console.error("Modules API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
