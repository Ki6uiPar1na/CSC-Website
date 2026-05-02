import pool from './db';
import { RowDataPacket } from 'mysql2';

export interface Achievement {
  title: string;
  description: string;
  icon: string;
  unlockedAt?: Date;
}

export const AchievementModel = {
  // Check if user has unlocked specific achievements
  async getUserAchievements(userId: number): Promise<Achievement[]> {
    const achievements: Achievement[] = [];

    // Get user stats
    const [userStats] = await pool.query<RowDataPacket[]>(
      'SELECT total_points, longest_streak FROM users WHERE id = ?',
      [userId]
    );

    if (!userStats[0]) return achievements;

    const user = userStats[0];

    // Achievement: First Solve
    const [firstSolve] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM submissions WHERE user_id = ? AND is_correct = true',
      [userId]
    );
    if (firstSolve[0].count >= 1) {
      achievements.push({
        title: 'First Blood',
        description: 'Solve your first challenge',
        icon: '🎯',
      });
    }

    // Achievement: Streak Master (7 day streak)
    if (user.longest_streak >= 7) {
      achievements.push({
        title: 'Streak Master',
        description: 'Achieve a 7-day solving streak',
        icon: '🔥',
      });
    }

    // Achievement: Century (100 points)
    if (user.total_points >= 100) {
      achievements.push({
        title: 'Century',
        description: 'Earn 100 total points',
        icon: '💯',
      });
    }

    // Achievement: Legendary (1000 points)
    if (user.total_points >= 1000) {
      achievements.push({
        title: 'Legendary',
        description: 'Earn 1000 total points',
        icon: '⭐',
      });
    }

    // Achievement: Speed Runner (solve 5 challenges)
    const [speedRunner] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM submissions WHERE user_id = ? AND is_correct = true',
      [userId]
    );
    if (speedRunner[0].count >= 5) {
      achievements.push({
        title: 'Speed Runner',
        description: 'Solve 5 challenges',
        icon: '⚡',
      });
    }

    // Achievement: Module Master (complete a module)
    const [modules] = await pool.query<RowDataPacket[]>('SELECT module_id FROM modules');
    for (const mod of modules) {
      const [challenges] = await pool.query<RowDataPacket[]>(
        'SELECT id FROM tasks WHERE module_id = ?',
        [mod.module_id]
      );
      const [solves] = await pool.query<RowDataPacket[]>(
        `SELECT task_id FROM submissions s 
         JOIN tasks t ON s.task_id = t.task_id 
         WHERE s.user_id = ? AND t.module_id = ? AND s.is_correct = true`,
        [userId, mod.module_id]
      );
      if (challenges.length > 0 && challenges.length === solves.length) {
        achievements.push({
          title: 'Module Master',
          description: 'Complete an entire module',
          icon: '🎓',
        });
        break;
      }
    }

    return achievements;
  },
};
