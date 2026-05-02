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
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [lessons] = await pool.query<RowDataPacket[]>(
      `SELECT l.*, m.is_premium, m.title as module_title 
       FROM lessons l
       JOIN modules m ON l.module_id = m.id
       WHERE l.lesson_id = ?`,
      [id]
    );

    if (lessons.length === 0) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    const lesson = lessons[0];

    // Fetch content from GitHub if URL is present
    if (lesson.github_url) {
      try {
        let rawUrl = lesson.github_url;
        // Convert regular github.com URL to raw.githubusercontent.com
        if (rawUrl.includes("github.com") && !rawUrl.includes("raw.githubusercontent.com")) {
          rawUrl = rawUrl
            .replace("github.com", "raw.githubusercontent.com")
            .replace("/blob/", "/");
        }
        
        const response = await fetch(rawUrl);
        if (response.ok) {
          lesson.content = await response.text();
        } else {
          console.error("Failed to fetch GitHub content:", response.statusText);
          lesson.content = "# Error\nFailed to fetch content from GitHub. Please contact the administrator.";
        }
      } catch (err) {
        console.error("GitHub Fetch Error:", err);
        lesson.content = "# Error\nAn unexpected error occurred while fetching content from GitHub.";
      }
    }

    // Check if user has access if it's premium
    if (lesson.is_premium) {
      const userId = (session.user as any).id;
      const [user] = await pool.query<RowDataPacket[]>(
        "SELECT subscription_status, subscription_expires_at FROM users WHERE id = ?",
        [userId]
      );
      
      const isPremium = user[0]?.subscription_status === 'active' && 
                        (!user[0]?.subscription_expires_at || new Date(user[0].subscription_expires_at) > new Date());
      
      if (!isPremium) {
        return NextResponse.json({ error: "Premium subscription required" }, { status: 403 });
      }
    }

    // Fetch next/prev lesson IDs
    const [prevLessons] = await pool.query<RowDataPacket[]>(
      "SELECT lesson_id FROM lessons WHERE module_id = ? AND order_index < ? ORDER BY order_index DESC LIMIT 1",
      [lesson.module_id, lesson.order_index]
    );
    const [nextLessons] = await pool.query<RowDataPacket[]>(
      "SELECT lesson_id FROM lessons WHERE module_id = ? AND order_index > ? ORDER BY order_index ASC LIMIT 1",
      [lesson.module_id, lesson.order_index]
    );

    // Fetch exam if exists
    const [exams] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM exams WHERE lesson_id = ?",
      [id]
    );

    return NextResponse.json({
      ...lesson,
      prev_lesson_id: prevLessons[0]?.lesson_id || null,
      next_lesson_id: nextLessons[0]?.lesson_id || null,
      exam_id: exams[0]?.id || null
    });
  } catch (error: any) {
    console.error("Lesson Detail API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
