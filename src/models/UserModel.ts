import pool from './db';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

export interface User extends RowDataPacket {
  id: number;
  role_id: number;
  username: string;
  email: string;
  password_hash: string;
  created_at: Date;
  last_active_date: string | null;
  current_streak: number;
  total_points: number;
  score: number;
  subscription_expires_at: Date | null;
  subscription_status: 'active' | 'inactive' | 'canceled';
}

export const UserModel = {
  async findByUsername(username: string): Promise<User | null> {
    const [rows] = await pool.query<User[]>('SELECT * FROM users WHERE username = ?', [username]);
    return rows[0] || null;
  },

  async findByEmail(email: string): Promise<User | null> {
    const [rows] = await pool.query<User[]>('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0] || null;
  },

  async findById(id: number): Promise<User | null> {
    const [rows] = await pool.query<User[]>('SELECT * FROM users WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async createUser(username: string, email: string, passwordHash: string): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, passwordHash]
    );
    return result.insertId;
  },

  async updateLastActive(userId: number, date: string): Promise<void> {
    await pool.query('UPDATE users SET last_active_date = ? WHERE id = ?', [date, userId]);
  },

  async updateStreak(userId: number, streak: number): Promise<void> {
    await pool.query('UPDATE users SET current_streak = ? WHERE id = ?', [streak, userId]);
  },

  async addToPoints(userId: number, points: number): Promise<void> {
    await pool.query('UPDATE users SET total_points = total_points + ? WHERE id = ?', [points, userId]);
  },

  async addToScore(userId: number, score: number): Promise<void> {
    await pool.query('UPDATE users SET score = score + ? WHERE id = ?', [score, userId]);
  },

  async getLeaderboard(limit: number = 15, offset: number = 0): Promise<User[]> {
    const [rows] = await pool.query<User[]>('SELECT id, username, total_points, current_streak FROM users ORDER BY total_points DESC LIMIT ? OFFSET ?', [limit, offset]);
    return rows;
  }
};
