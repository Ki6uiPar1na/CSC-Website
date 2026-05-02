import pool from './db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface Lesson extends RowDataPacket {
  lesson_id: number;
  module_id: number;
  title: string;
  content: string;
  video_url: string | null;
  image_url: string | null;
  order_index: number;
}

export const LessonModel = {
  async getAll(): Promise<Lesson[]> {
    const [rows] = await pool.query<Lesson[]>('SELECT * FROM lessons ORDER BY module_id, order_index');
    return rows;
  },

  async findById(id: number): Promise<Lesson | null> {
    const [rows] = await pool.query<Lesson[]>('SELECT * FROM lessons WHERE lesson_id = ?', [id]);
    return rows[0] || null;
  },

  async findByModule(moduleId: number): Promise<Lesson[]> {
    const [rows] = await pool.query<Lesson[]>('SELECT * FROM lessons WHERE module_id = ? ORDER BY order_index', [moduleId]);
    return rows;
  },

  async create(data: Partial<Lesson>): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO lessons (module_id, title, content, video_url, image_url, order_index) VALUES (?, ?, ?, ?, ?, ?)',
      [data.module_id, data.title, data.content, data.video_url || null, data.image_url || null, data.order_index || 0]
    );
    return result.insertId;
  },

  async update(id: number, data: Partial<Lesson>): Promise<void> {
    await pool.query(
      'UPDATE lessons SET title = ?, content = ?, video_url = ?, image_url = ?, order_index = ? WHERE lesson_id = ?',
      [data.title, data.content, data.video_url, data.image_url, data.order_index, id]
    );
  },

  async delete(id: number): Promise<void> {
    await pool.query('DELETE FROM lessons WHERE lesson_id = ?', [id]);
  }
};
