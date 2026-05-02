import { NextResponse } from "next/server";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";
import { checkAdminRole } from "@/lib/admin-auth";

export async function GET(req: Request) {
  try {
    const auth = await checkAdminRole([1, 2]); // Admin and Instructor
    if (!auth.authorized) return auth.response;

    const { searchParams } = new URL(req.url);
    const moduleId = searchParams.get("moduleId");

    let query = "SELECT * FROM lessons";
    let params: any[] = [];

    if (moduleId) {
      query += " WHERE module_id = ? ORDER BY order_index ASC";
      params.push(parseInt(moduleId));
    } else {
      query += " ORDER BY module_id, order_index ASC";
    }

    const [lessons] = await pool.query<RowDataPacket[]>(query, params);
    return NextResponse.json({ lessons }, { status: 200 });
  } catch (error: any) {
    console.error("Get Lessons Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await checkAdminRole([1, 2]); // Admin and Instructor
    if (!auth.authorized) return auth.response;

    const body = await req.json();
    const { moduleId, title, content, github_url, video_url, image_url, order_index } = body;

    if (!moduleId || !title) {
      return NextResponse.json({ error: "Module ID and Title required" }, { status: 400 });
    }

    const [result] = await pool.query(
      `INSERT INTO lessons (module_id, title, content, github_url, video_url, image_url, order_index) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [moduleId, title, content || "", github_url || null, video_url || null, image_url || null, order_index || 0]
    );

    return NextResponse.json(
      { success: true, message: "Lesson created", lessonId: (result as any).insertId },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Create Lesson Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const auth = await checkAdminRole([1, 2]); // Admin and Instructor
    if (!auth.authorized) return auth.response;

    const body = await req.json();
    const { lessonId, title, content, github_url, video_url, image_url, order_index } = body;

    if (!lessonId) return NextResponse.json({ error: "Lesson ID required" }, { status: 400 });

    const updates = [];
    const values = [];

    if (title !== undefined) {
      updates.push("title = ?");
      values.push(title);
    }
    if (content !== undefined) {
      updates.push("content = ?");
      values.push(content);
    }
    if (github_url !== undefined) {
      updates.push("github_url = ?");
      values.push(github_url);
    }
    if (video_url !== undefined) {
      updates.push("video_url = ?");
      values.push(video_url);
    }
    if (image_url !== undefined) {
      updates.push("image_url = ?");
      values.push(image_url);
    }
    if (order_index !== undefined) {
      updates.push("order_index = ?");
      values.push(order_index);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    values.push(lessonId);

    await pool.query(`UPDATE lessons SET ${updates.join(", ")} WHERE lesson_id = ?`, values);

    return NextResponse.json({ success: true, message: "Lesson updated" }, { status: 200 });
  } catch (error: any) {
    console.error("Update Lesson Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await checkAdminRole([1, 2]); // Admin and Instructor
    if (!auth.authorized) return auth.response;

    const body = await req.json();
    const { lessonId } = body;

    if (!lessonId) return NextResponse.json({ error: "Lesson ID required" }, { status: 400 });

    await pool.query("DELETE FROM lessons WHERE lesson_id = ?", [lessonId]);

    return NextResponse.json({ success: true, message: "Lesson deleted" }, { status: 200 });
  } catch (error: any) {
    console.error("Delete Lesson Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
