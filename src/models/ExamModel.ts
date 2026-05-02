import pool from './db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface Exam extends RowDataPacket {
  id: number;
  lesson_id: number;
  title: string;
  description: string;
  created_at: Date;
}

export interface ExamQuestion extends RowDataPacket {
  id: number;
  exam_id: number;
  question_type: 'mcq' | 'fitb' | 'challenge';
  question_text: string;
  points: number;
  challenge_id: number | null;
  options?: ExamOption[];
}

export interface ExamOption extends RowDataPacket {
  id: number;
  question_id: number;
  option_text: string;
  is_correct: boolean;
}

export const ExamModel = {
  async findByLessonId(lessonId: number): Promise<Exam | null> {
    const [rows] = await pool.query<Exam[]>('SELECT * FROM exams WHERE lesson_id = ?', [lessonId]);
    return rows[0] || null;
  },

  async getQuestions(examId: number): Promise<ExamQuestion[]> {
    const [questions] = await pool.query<ExamQuestion[]>('SELECT * FROM exam_questions WHERE exam_id = ?', [examId]);
    
    for (const q of questions) {
      if (q.question_type === 'mcq') {
        const [options] = await pool.query<ExamOption[]>('SELECT * FROM exam_options WHERE question_id = ?', [q.id]);
        q.options = options;
      }
    }
    
    return questions;
  },

  async createExam(lessonId: number, title: string, description: string): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO exams (lesson_id, title, description) VALUES (?, ?, ?)',
      [lessonId, title, description]
    );
    return result.insertId;
  },

  async addQuestion(data: Partial<ExamQuestion>): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO exam_questions (exam_id, question_type, question_text, points, challenge_id) VALUES (?, ?, ?, ?, ?)',
      [data.exam_id, data.question_type, data.question_text, data.points, data.challenge_id || null]
    );
    return result.insertId;
  },

  async addOption(questionId: number, text: string, isCorrect: boolean): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO exam_options (question_id, option_text, is_correct) VALUES (?, ?, ?)',
      [questionId, text, isCorrect]
    );
    return result.insertId;
  },

  async submitAnswer(userId: number, examId: number, questionId: number, answerText: string, isCorrect: boolean, points: number): Promise<void> {
    await pool.query(
      'INSERT INTO exam_submissions (user_id, exam_id, question_id, answer_text, is_correct, points_awarded) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, examId, questionId, answerText, isCorrect, points]
    );
  },

  async hasUserCompletedExam(userId: number, examId: number): Promise<boolean> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT DISTINCT question_id FROM exam_submissions WHERE user_id = ? AND exam_id = ?',
      [userId, examId]
    );
    const [questions] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM exam_questions WHERE exam_id = ?',
      [examId]
    );
    return rows.length > 0 && rows.length === questions.length;
  }
};
