import pool from './db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface Challenge extends RowDataPacket {
  id: number;
  module_id: number;
  title: string;
  description: string;
  flag: string;
  max_points: number;
  min_points: number;
  decay_limit: number;
  solve_count: number;
  current_points: number;
  is_premium: boolean;
  module_title?: string;
}

export const ChallengeModel = {
  async getAll(): Promise<Challenge[]> {
    const [rows] = await pool.query<Challenge[]>(`
      SELECT c.*, m.title as module_title 
      FROM challenges c 
      JOIN modules m ON c.module_id = m.id
    `);
    return rows;
  },

  async findById(id: number): Promise<Challenge | null> {
    const [rows] = await pool.query<Challenge[]>('SELECT * FROM challenges WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async incrementSolveCount(id: number): Promise<void> {
    await pool.query('UPDATE challenges SET solve_count = solve_count + 1 WHERE id = ?', [id]);
  },

  async updateCurrentPoints(id: number, points: number): Promise<void> {
    await pool.query('UPDATE challenges SET current_points = ? WHERE id = ?', [points, id]);
  },

  async getModuleChallenges(moduleId: number): Promise<Challenge[]> {
    const [rows] = await pool.query<Challenge[]>('SELECT id FROM challenges WHERE module_id = ?', [moduleId]);
    return rows;
  }
};
