import { NextResponse } from "next/server";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const userId = session?.user && "id" in session.user ? parseInt((session.user as any).id) : null;

    // Fetch module details
    const [modules] = await pool.query<RowDataPacket[]>(
      "SELECT id, title, description, is_premium, completion_bonus_points FROM modules WHERE id = ?",
      [id]
    );

    if (modules.length === 0) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    const module = modules[0];

    // Fetch lessons for this module
    const [lessons] = await pool.query<RowDataPacket[]>(
      `SELECT l.lesson_id, l.title, l.order_index, 
       (SELECT COUNT(*) FROM exams WHERE lesson_id = l.lesson_id) as has_exam,
       (SELECT COUNT(*) FROM lesson_completion WHERE lesson_id = l.lesson_id AND user_id = ?) as is_completed
       FROM lessons l
       WHERE l.module_id = ? 
       ORDER BY l.order_index ASC`,
      [userId || 0, id]
    );

    module.lessons = lessons.map(l => ({
      ...l,
      is_completed: l.is_completed > 0
    }));

    return NextResponse.json(module);
  } catch (error: any) {
    console.error("Module Detail API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
