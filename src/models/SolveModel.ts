import pool from './db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface Solve extends RowDataPacket {
  id: number;
  user_id: number;
  challenge_id: number;
  solved_at: Date;
  points_awarded: number;
}

export const SolveModel = {
  async hasSolved(userId: number, challengeId: number): Promise<boolean> {
    const [rows] = await pool.query<Solve[]>('SELECT id FROM solves WHERE user_id = ? AND challenge_id = ?', [userId, challengeId]);
    return rows.length > 0;
  },

  async recordSolve(userId: number, challengeId: number, points: number): Promise<void> {
    await pool.query(
      'INSERT INTO solves (user_id, challenge_id, points_awarded) VALUES (?, ?, ?)',
      [userId, challengeId, points]
    );
  },

  async getUserSolvesForModule(userId: number, moduleId: number): Promise<number[]> {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT s.challenge_id 
      FROM solves s 
      JOIN challenges c ON s.challenge_id = c.id 
      WHERE s.user_id = ? AND c.module_id = ?
    `, [userId, moduleId]);
    return rows.map(r => r.challenge_id);
  },

  async getAllUserSolves(userId: number): Promise<Solve[]> {
    const [rows] = await pool.query<Solve[]>('SELECT * FROM solves WHERE user_id = ? ORDER BY solved_at DESC', [userId]);
    return rows;
  }
};
