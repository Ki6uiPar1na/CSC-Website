import { NextResponse, NextRequest } from "next/server";
import pool from "@/models/db";
import { RowDataPacket } from "mysql2";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user && "id" in session.user ? parseInt((session.user as any).id) : null;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { resourceId, completed } = await req.json();

    if (!resourceId) {
      return NextResponse.json({ error: "resourceId is required" }, { status: 400 });
    }

    // Verify resource exists
    const [resource] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM resources WHERE id = ?",
      [resourceId]
    );
    if (resource.length === 0) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    if (completed) {
      await pool.query(
        "INSERT IGNORE INTO resource_completions (user_id, resource_id) VALUES (?, ?)",
        [userId, resourceId]
      );
    } else {
      await pool.query(
        "DELETE FROM resource_completions WHERE user_id = ? AND resource_id = ?",
        [userId, resourceId]
      );
    }

    return NextResponse.json({ success: true, completed });
  } catch (error: any) {
    console.error("Resource completion error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
