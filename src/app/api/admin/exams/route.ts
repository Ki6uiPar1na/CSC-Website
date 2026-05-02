import { NextResponse } from "next/server";
import pool from "@/models/db";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import { checkAdminRole } from "@/lib/admin-auth";

export async function GET(req: Request) {
  try {
    const auth = await checkAdminRole([1, 2]); // Admin and Instructor
    if (!auth.authorized) return auth.response;

    const { searchParams } = new URL(req.url);
    const lessonId = searchParams.get("lessonId");

    if (lessonId) {
      const [exams] = await pool.query<RowDataPacket[]>(
        "SELECT * FROM exams WHERE lesson_id = ?",
        [parseInt(lessonId)]
      );
      
      if (exams.length > 0) {
        const exam = exams[0];
        const [questions] = await pool.query<RowDataPacket[]>(
          "SELECT * FROM exam_questions WHERE exam_id = ?",
          [exam.id]
        );
        
        for (const q of questions) {
          if (q.question_type === 'mcq' || q.question_type === 'fitb') {
            const [options] = await pool.query<RowDataPacket[]>(
              "SELECT * FROM exam_options WHERE question_id = ?",
              [q.id]
            );
            q.options = options;
          }
        }
        exam.questions = questions;
        return NextResponse.json({ exam }, { status: 200 });
      }
      return NextResponse.json({ exam: null }, { status: 200 });
    }

    const [allExams] = await pool.query<RowDataPacket[]>("SELECT * FROM exams");
    return NextResponse.json({ exams: allExams }, { status: 200 });
  } catch (error: any) {
    console.error("Get Exams Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST for creating new exam or new question in existing exam
export async function POST(req: Request) {
  try {
    const auth = await checkAdminRole([1, 2]); // Admin and Instructor
    if (!auth.authorized) return auth.response;

    const body = await req.json();
    const { lessonId, examId, question_type, question_text, points, challenge_id, options, title, description } = body;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      let targetExamId = examId;

      // If no examId provided, check if one exists for lesson or create it
      if (!targetExamId && lessonId) {
        const [existingExams] = await connection.query<RowDataPacket[]>(
          "SELECT id FROM exams WHERE lesson_id = ?",
          [lessonId]
        );
        if (existingExams.length > 0) {
          targetExamId = existingExams[0].id;
        } else {
          const [examResult] = await connection.query<ResultSetHeader>(
            "INSERT INTO exams (lesson_id, title, description) VALUES (?, ?, ?)",
            [lessonId, title || "Practice Problems", description || ""]
          );
          targetExamId = examResult.insertId;
        }
      }

      // If question details provided, add the question
      if (targetExamId && question_type) {
        const [qResult] = await connection.query<ResultSetHeader>(
          "INSERT INTO exam_questions (exam_id, question_type, question_text, points, challenge_id) VALUES (?, ?, ?, ?, ?)",
          [targetExamId, question_type, question_text, points || 0, challenge_id || null]
        );
        const questionId = qResult.insertId;

        if (options && Array.isArray(options)) {
          for (const opt of options) {
            if (opt.option_text) {
              await connection.query(
                "INSERT INTO exam_options (question_id, option_text, is_correct) VALUES (?, ?, ?)",
                [questionId, opt.option_text, opt.is_correct || false]
              );
            }
          }
        }
      }

      await connection.commit();
      connection.release();
      return NextResponse.json({ success: true, message: "Created successfully", examId: targetExamId }, { status: 201 });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error: any) {
    console.error("Create Exam/Question Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT for updating question
export async function PUT(req: Request) {
  try {
    const auth = await checkAdminRole([1, 2]); // Admin and Instructor
    if (!auth.authorized) return auth.response;

    const body = await req.json();
    const { questionId, question_type, question_text, points, challenge_id, options } = body;

    if (!questionId) return NextResponse.json({ error: "Question ID required" }, { status: 400 });

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Update question
      await connection.query(
        "UPDATE exam_questions SET question_type = ?, question_text = ?, points = ?, challenge_id = ? WHERE id = ?",
        [question_type, question_text, points, challenge_id, questionId]
      );

      // Handle options (MCQ and FITB)
      if (options && Array.isArray(options)) {
        // Simple approach: delete existing options and re-insert
        await connection.query("DELETE FROM exam_options WHERE question_id = ?", [questionId]);
        
        for (const opt of options) {
          if (opt.option_text) {
            await connection.query(
              "INSERT INTO exam_options (question_id, option_text, is_correct) VALUES (?, ?, ?)",
              [questionId, opt.option_text, opt.is_correct || false]
            );
          }
        }
      }

      await connection.commit();
      connection.release();
      return NextResponse.json({ success: true, message: "Updated successfully" }, { status: 200 });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error: any) {
    console.error("Update Question Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await checkAdminRole([1, 2]); // Admin and Instructor
    if (!auth.authorized) return auth.response;

    const body = await req.json();
    const { examId, questionId } = body;

    if (questionId) {
      await pool.query("DELETE FROM exam_questions WHERE id = ?", [questionId]);
      return NextResponse.json({ success: true, message: "Question deleted" }, { status: 200 });
    }

    if (examId) {
      await pool.query("DELETE FROM exams WHERE id = ?", [examId]);
      return NextResponse.json({ success: true, message: "Exam deleted" }, { status: 200 });
    }

    return NextResponse.json({ error: "Exam ID or Question ID required" }, { status: 400 });
  } catch (error: any) {
    console.error("Delete Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
