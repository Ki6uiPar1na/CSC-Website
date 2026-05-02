import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/models/db";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import { withCache, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";
import { enforceRateLimit } from "@/lib/rateLimitMiddleware";

export async function GET(req: NextRequest) {
  try {
    // Rate limiting (60 per minute)
    const { allowed, response: rateLimitResponse } = await enforceRateLimit(
      req,
      "GET_EXAMS"
    );

    if (!allowed) {
      return rateLimitResponse!;
    }
    const session = await getServerSession(authOptions);
    const userId = session?.user && "id" in session.user ? parseInt((session.user as any).id) : null;
    const userRole = session?.user && "role" in session.user ? (session.user as any).role : null;

    // Check premium status
    let isPremium = false;
    if (userId) {
      const isPremiumCached = await withCache(
        `${CACHE_KEYS.USER_PROFILE}:exams`,
        async () => {
          const [premiumRows] = await pool.query<RowDataPacket[]>(
            `SELECT 1 FROM upgrade_code_usage u 
             JOIN upgrade_codes c ON u.upgrade_code_id = c.id 
             WHERE u.user_id = ? AND c.is_active = TRUE LIMIT 1`,
            [userId]
          );
          return premiumRows.length > 0;
        },
        CACHE_TTL.SHORT,
        { userId },
        userId
      );
      isPremium = isPremiumCached;
    }
    const isAdmin = userRole === 1;

    const url = new URL(req.url);
    const examId = url.searchParams.get("examId");
    const lessonId = url.searchParams.get("lessonId");

    let query = "SELECT id, lesson_id, title, description FROM exams WHERE ";
    let params = [];

    if (examId) {
      query += "id = ?";
      params.push(parseInt(examId));
    } else {
      query += "lesson_id = ?";
      params.push(parseInt(lessonId!));
    }

    const exams = await withCache(
      CACHE_KEYS.EXAMS,
      async () => {
        const [result] = await pool.query<RowDataPacket[]>(query, params);
        return result;
      },
      CACHE_TTL.LONG,
      { examId, lessonId }
    );

    if (exams.length === 0) return NextResponse.json({ exam: null });

    const exam = exams[0];
    
    // Fetch questions and check if linked challenges are premium
    const questions = await withCache(
      `${CACHE_KEYS.EXAMS}:questions`,
      async () => {
        const [result] = await pool.query<RowDataPacket[]>(
          `SELECT q.id, q.question_type, q.question_text, q.points, q.challenge_id, c.is_premium as challenge_premium
           FROM exam_questions q
           LEFT JOIN challenges c ON q.challenge_id = c.id
           WHERE q.exam_id = ?`,
          [exam.id]
        );
        return result;
      },
      CACHE_TTL.LONG,
      { examId: exam.id }
    );

    // Filter out premium challenges for free users
    let filteredQuestions = questions;
    if (!isAdmin && !isPremium) {
      filteredQuestions = questions.filter(q => {
        if (q.question_type === 'challenge' && q.challenge_premium) return false;
        return true;
      });
    }

    for (const q of filteredQuestions) {
      if (q.question_type === 'mcq' || q.question_type === 'checkbox') {
        const options = await withCache(
          `${CACHE_KEYS.EXAMS}:options`,
          async () => {
            const [result] = await pool.query<RowDataPacket[]>(
              "SELECT id, option_text FROM exam_options WHERE question_id = ?",
              [q.id]
            );
            return result;
          },
          CACHE_TTL.LONG,
          { questionId: q.id }
        );
        q.options = options;
      }
    }
    exam.questions = filteredQuestions;

    return NextResponse.json({ exam });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;
    
    // Check premium status
    const [premiumRows] = await pool.query<RowDataPacket[]>(
      `SELECT 1 FROM upgrade_code_usage u 
       JOIN upgrade_codes c ON u.upgrade_code_id = c.id 
       WHERE u.user_id = ? AND c.is_active = TRUE LIMIT 1`,
      [userId]
    );
    const isPremium = premiumRows.length > 0;
    const isAdmin = userRole === 1;

    const body = await req.json();
    const { examId, answers } = body; // answers: { [questionId]: answerValue }

    if (!examId || !answers) return NextResponse.json({ error: "Exam ID and answers required" }, { status: 400 });

    // Fetch questions and check if linked challenges are premium
    const [allQuestions] = await pool.query<RowDataPacket[]>(
      `SELECT q.*, c.is_premium as challenge_premium
       FROM exam_questions q
       LEFT JOIN challenges c ON q.challenge_id = c.id
       WHERE q.exam_id = ?`,
      [examId]
    );

    // Filter questions based on premium access
    const availableQuestions = allQuestions.filter(q => {
      if (isAdmin || isPremium) return true;
      if (q.question_type === 'challenge' && q.challenge_premium) return false;
      return true;
    });

    let totalPointsAwarded = 0;
    let correctCount = 0;
    const results = [];

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      for (const q of availableQuestions) {
        const userAnswer = answers[q.id];
        let isCorrect = false;
        let pointsAwarded = 0;

        if (q.question_type === 'mcq') {
          const [correctOption] = await connection.query<RowDataPacket[]>(
            "SELECT id FROM exam_options WHERE question_id = ? AND is_correct = TRUE",
            [q.id]
          );
          if (correctOption.length > 0 && String(userAnswer) === String(correctOption[0].id)) {
            isCorrect = true;
          }
        } else if (q.question_type === 'checkbox') {
          const [correctOptions] = await connection.query<RowDataPacket[]>(
            "SELECT id FROM exam_options WHERE question_id = ? AND is_correct = TRUE",
            [q.id]
          );
          const correctIds = correctOptions.map(o => String(o.id)).sort();
          const userIds = Array.isArray(userAnswer) ? userAnswer.map(id => String(id)).sort() : [];
          
          if (correctIds.length === userIds.length && correctIds.every((val, index) => val === userIds[index])) {
            isCorrect = true;
          }
        } else if (q.question_type === 'fitb') {
          const [correctAnswer] = await connection.query<RowDataPacket[]>(
            "SELECT option_text FROM exam_options WHERE question_id = ? AND is_correct = TRUE",
            [q.id]
          );
          if (correctAnswer.length > 0 && String(userAnswer).trim().toLowerCase() === correctAnswer[0].option_text.trim().toLowerCase()) {
            isCorrect = true;
          }
        } else if (q.question_type === 'challenge') {
          const [solve] = await connection.query<RowDataPacket[]>(
            "SELECT id FROM solves WHERE user_id = ? AND challenge_id = ?",
            [userId, q.challenge_id]
          );
          if (solve.length > 0) {
            isCorrect = true;
          }
        }

        if (isCorrect) {
          pointsAwarded = q.points;
          totalPointsAwarded += pointsAwarded;
          correctCount++;
        }

        const [existing] = await connection.query<RowDataPacket[]>(
          "SELECT id, is_correct FROM exam_submissions WHERE user_id = ? AND question_id = ?",
          [userId, q.id]
        );

        if (existing.length > 0) {
          if (!existing[0].is_correct || isCorrect) {
            await connection.query(
              "UPDATE exam_submissions SET answer_text = ?, is_correct = ?, points_awarded = ? WHERE id = ?",
              [JSON.stringify(userAnswer || ""), isCorrect, pointsAwarded, existing[0].id]
            );
          }
        } else {
          await connection.query(
            "INSERT INTO exam_submissions (user_id, exam_id, question_id, answer_text, is_correct, points_awarded) VALUES (?, ?, ?, ?, ?, ?)",
            [userId, examId, q.id, JSON.stringify(userAnswer || ""), isCorrect, pointsAwarded]
          );
        }

        results.push({ questionId: q.id, isCorrect, pointsAwarded });
      }

      if (totalPointsAwarded > 0) {
        await connection.query(
          "UPDATE users SET total_points = total_points + ? WHERE id = ?",
          [totalPointsAwarded, userId]
        );
      }

      // Mark lesson as completed ONLY if all AVAILABLE questions are correct
      if (correctCount === availableQuestions.length && availableQuestions.length > 0) {
        const [examData] = await connection.query<RowDataPacket[]>(
          "SELECT lesson_id FROM exams WHERE id = ?",
          [examId]
        );
        if (examData.length > 0) {
          await connection.query(
            "INSERT IGNORE INTO lesson_completion (user_id, lesson_id) VALUES (?, ?)",
            [userId, examData[0].lesson_id]
          );
        }
      }

      await connection.commit();
      connection.release();
      return NextResponse.json({ 
        success: true, 
        totalPointsAwarded, 
        results,
        isPerfect: correctCount === availableQuestions.length,
        message: correctCount === availableQuestions.length ? "Lesson Completed!" : "Some answers are incorrect. Try again to complete the lesson."
      });
    } catch (err) {
      await connection.rollback();
      connection.release();
      throw err;
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
