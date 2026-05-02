import pool from './db';
import { RowDataPacket } from 'mysql2';

export const ScoringModel = {
  calculateDynamicPoints(maxPoints: number, minPoints: number, decayLimit: number, solveCount: number): number {
    if (solveCount >= decayLimit) return minPoints;
    
    // Linear decay formula
    const decayPerSolve = (maxPoints - minPoints) / decayLimit;
    const currentPoints = Math.max(minPoints, Math.floor(maxPoints - (solveCount * decayPerSolve)));
    return currentPoints;
  },

  async checkModuleCompletionBonus(userId: number, moduleId: number): Promise<number> {
    const [challenges] = await pool.query<RowDataPacket[]>('SELECT id FROM challenges WHERE module_id = ?', [moduleId]);
    const [solves] = await pool.query<RowDataPacket[]>(`
      SELECT challenge_id FROM solves s 
      JOIN challenges c ON s.challenge_id = c.id 
      WHERE s.user_id = ? AND c.module_id = ?
    `, [userId, moduleId]);

    if (challenges.length > 0 && challenges.length === solves.length) {
      const [module] = await pool.query<RowDataPacket[]>('SELECT completion_bonus_points FROM modules WHERE id = ?', [moduleId]);
      return module[0]?.completion_bonus_points || 0;
    }
    return 0;
  },

  async getUserModuleStatus(userId: number): Promise<{moduleId: number, title: string, isCompleted: boolean}[]> {
    const [modules] = await pool.query<RowDataPacket[]>('SELECT id, title FROM modules');
    const status = [];

    for (const mod of modules) {
      const [challenges] = await pool.query<RowDataPacket[]>('SELECT id FROM challenges WHERE module_id = ?', [mod.id]);
      const [solves] = await pool.query<RowDataPacket[]>(`
        SELECT challenge_id FROM solves s 
        JOIN challenges c ON s.challenge_id = c.id 
        WHERE s.user_id = ? AND c.module_id = ?
      `, [userId, mod.id]);

      status.push({
        moduleId: mod.id,
        title: mod.title,
        isCompleted: challenges.length > 0 && challenges.length === solves.length
      });
    }
    return status;
  },

  async handleDailyConsistencyBonus(userId: number): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().split('T')[0];

    const [userRows] = await pool.query<RowDataPacket[]>('SELECT last_active_date, current_streak FROM users WHERE id = ?', [userId]);
    const user = userRows[0];

    if (!user) return 0;

    const lastActive = user.last_active_date ? new Date(user.last_active_date).toISOString().split('T')[0] : null;

    if (lastActive === today) return 0; // Already active today

    let newStreak = 1;
    if (lastActive === yesterday) {
      newStreak = user.current_streak + 1;
    }

    await pool.query('UPDATE users SET current_streak = ?, last_active_date = ? WHERE id = ?', [newStreak, today, userId]);
    
    const bonus = Math.min(newStreak * 10, 100); // 10 points per streak day, max 100
    
    await pool.query('INSERT IGNORE INTO daily_activity (user_id, activity_date, bonus_awarded) VALUES (?, ?, ?)', [userId, today, bonus]);
    
    return bonus;
  }
};
