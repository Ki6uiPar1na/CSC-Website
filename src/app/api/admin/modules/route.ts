import { NextResponse } from "next/server";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";
import { checkAdminRole } from "@/lib/admin-auth";

export async function GET(req: Request) {
  try {
    const auth = await checkAdminRole([1, 2]);
    if (!auth.authorized) return auth.response;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "15");
    const offset = (page - 1) * limit;

    const [countResult] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) as total FROM modules"
    );
    const total = (countResult[0] as any).total;

    const [modules] = await pool.query<RowDataPacket[]>(
      `SELECT id, title, description, is_premium, completion_bonus_points, instructor_id, created_at 
       FROM modules ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    return NextResponse.json({
      modules,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }, { status: 200 });
  } catch (error: any) {
    console.error("Get Modules Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await checkAdminRole([1, 2]); // Admin and Instructor
    if (!auth.authorized) return auth.response;

    const userId = auth.userId;
    const body = await req.json();
    const { title, description, is_premium, completion_bonus_points } = body;

    if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });

    const [result] = await pool.query(
      `INSERT INTO modules (title, name, description, is_premium, completion_bonus_points, instructor_id) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [title, title, description || "", is_premium || false, completion_bonus_points || 100, userId]
    );

    // Fetch updated modules list
    const [modules] = await pool.query<RowDataPacket[]>(
      `SELECT id, title, description, is_premium, completion_bonus_points, instructor_id, created_at 
       FROM modules ORDER BY created_at DESC`
    );

    return NextResponse.json(
      { success: true, message: "Module created", modules },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Create Module Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const auth = await checkAdminRole([1, 2]); // Admin and Instructor
    if (!auth.authorized) return auth.response;

    const body = await req.json();
    const { moduleId, title, description, is_premium, completion_bonus_points } = body;

    if (!moduleId) return NextResponse.json({ error: "Module ID required" }, { status: 400 });

    const updates = [];
    const values = [];

    if (title !== undefined) {
      updates.push("title = ?");
      values.push(title);
    }
    if (description !== undefined) {
      updates.push("description = ?");
      values.push(description);
    }
    if (is_premium !== undefined) {
      updates.push("is_premium = ?");
      values.push(is_premium);
    }
    if (completion_bonus_points !== undefined) {
      updates.push("completion_bonus_points = ?");
      values.push(completion_bonus_points);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    values.push(moduleId);

    await pool.query(`UPDATE modules SET ${updates.join(", ")} WHERE id = ?`, values);

    // Fetch updated modules list
    const [modules] = await pool.query<RowDataPacket[]>(
      `SELECT id, title, description, is_premium, completion_bonus_points, instructor_id, created_at 
       FROM modules ORDER BY created_at DESC`
    );

    return NextResponse.json(
      { success: true, message: "Module updated", modules },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Update Module Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await checkAdminRole([1, 2]); // Admin and Instructor
    if (!auth.authorized) return auth.response;

    const body = await req.json();
    const { moduleId } = body;

    if (!moduleId) return NextResponse.json({ error: "Module ID required" }, { status: 400 });

    // Delete module and related challenges
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      // Get challenges in module
      const [challenges] = await connection.query<RowDataPacket[]>(
        "SELECT id FROM challenges WHERE module_id = ?",
        [moduleId]
      );
      
      // Delete solves for these challenges
      for (const challenge of challenges) {
        await connection.query("DELETE FROM solves WHERE challenge_id = ?", [challenge.id]);
      }
      
      // Delete challenges
      await connection.query("DELETE FROM challenges WHERE module_id = ?", [moduleId]);
      
      // Delete module
      await connection.query("DELETE FROM modules WHERE id = ?", [moduleId]);
      
      await connection.commit();
      connection.release();
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }

    // Fetch updated modules list
    const [modules] = await pool.query<RowDataPacket[]>(
      `SELECT id, title, description, is_premium, completion_bonus_points, instructor_id, created_at 
       FROM modules ORDER BY created_at DESC`
    );

    return NextResponse.json({ success: true, message: "Module deleted", modules }, { status: 200 });
  } catch (error: any) {
    console.error("Delete Module Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
