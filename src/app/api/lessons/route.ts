import { NextResponse } from "next/server";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const moduleId = searchParams.get("moduleId");

    if (!moduleId) {
      return NextResponse.json({ error: "Module ID required" }, { status: 400 });
    }

    const [lessons] = await pool.query<RowDataPacket[]>(
      `SELECT lesson_id, title, content, video_url, image_url, order_index 
       FROM lessons 
       WHERE module_id = ? 
       ORDER BY order_index ASC`,
      [parseInt(moduleId)]
    );

    return NextResponse.json(lessons || []);
  } catch (error: any) {
    console.error("Lessons API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
