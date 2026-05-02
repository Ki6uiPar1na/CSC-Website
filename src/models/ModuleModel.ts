import pool from './db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface Module extends RowDataPacket {
  id: number;
  title: string;
  description: string;
  completion_bonus_points: number;
  is_premium: boolean;
  instructor_id: number | null;
  completed_by_count: number;
  created_at: Date;
}

export const ModuleModel = {
  async getAll(): Promise<Module[]> {
    const [rows] = await pool.query<Module[]>('SELECT * FROM modules ORDER BY id ASC');
    return rows;
  },

  async findById(id: number): Promise<Module | null> {
    const [rows] = await pool.query<Module[]>('SELECT * FROM modules WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async create(data: Partial<Module>): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO modules (title, description, completion_bonus_points, is_premium, instructor_id) VALUES (?, ?, ?, ?, ?)',
      [data.title, data.description, data.completion_bonus_points || 0, data.is_premium || false, data.instructor_id || null]
    );
    return result.insertId;
  },

  async update(id: number, data: Partial<Module>): Promise<void> {
    await pool.query(
      'UPDATE modules SET title = ?, description = ?, completion_bonus_points = ?, is_premium = ? WHERE id = ?',
      [data.title, data.description, data.completion_bonus_points, data.is_premium, id]
    );
  },

  async delete(id: number): Promise<void> {
    await pool.query('DELETE FROM modules WHERE id = ?', [id]);
  }
};
