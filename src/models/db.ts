import mysql from 'mysql2/promise';

const dbUrl = process.env.DATABASE_URL || '';
const useSsl = dbUrl.includes('ssl=') || dbUrl.includes('tidbcloud.com');

const pool = mysql.createPool({
  uri: dbUrl,
  ssl: useSsl ? {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: dbUrl.includes('rejectUnauthorized=true') || dbUrl.includes('tidbcloud.com'),
  } : undefined,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

/**
 * SELF-HEALING DATABASE INITIALIZATION
 * Ensures new columns and tables exist to prevent JSON_ARRAYAGG crashes.
 */
async function initDb() {
  try {
    const conn = await pool.getConnection();
    console.log("[DB] Running auto-migration...");

    // 1. Columns
    const [cols]: any = await conn.query("SHOW COLUMNS FROM challenges LIKE 'prerequisite_id'");
    if (cols.length === 0) {
      await conn.query("ALTER TABLE challenges ADD COLUMN prerequisite_id INT NULL");
      console.log("[DB] Added prerequisite_id");
    }

    const [codeCols]: any = await conn.query("SHOW COLUMNS FROM upgrade_codes LIKE 'usage_limit'");
    if (codeCols.length === 0) {
      await conn.query("ALTER TABLE upgrade_codes ADD COLUMN usage_limit INT DEFAULT 1, ADD COLUMN usage_count INT DEFAULT 0");
      console.log("[DB] Added usage_limit and usage_count to upgrade_codes");
    }

    const [eventCols]: any = await conn.query("SHOW COLUMNS FROM events LIKE 'exclusivity_expires_at'");
    if (eventCols.length === 0) {
      await conn.query("ALTER TABLE events ADD COLUMN exclusivity_expires_at TIMESTAMP NULL AFTER is_premium");
      console.log("[DB] Added exclusivity_expires_at to events");
    }

    const [userScore]: any = await conn.query("SHOW COLUMNS FROM users LIKE 'score'");
    if (userScore.length === 0) {
      await conn.query("ALTER TABLE users ADD COLUMN score INT DEFAULT 0 AFTER total_points");
      console.log("[DB] Added score to users");
    }

    const [lessonVideo]: any = await conn.query("SHOW COLUMNS FROM lessons LIKE 'video_url'");
    if (lessonVideo.length === 0) {
      await conn.query("ALTER TABLE lessons ADD COLUMN video_url VARCHAR(500), ADD COLUMN image_url VARCHAR(500)");
      console.log("[DB] Added video_url and image_url to lessons");
    }

    const [lessonGithub]: any = await conn.query("SHOW COLUMNS FROM lessons LIKE 'github_url'");
    if (lessonGithub.length === 0) {
      await conn.query("ALTER TABLE lessons ADD COLUMN github_url VARCHAR(500) AFTER content");
      console.log("[DB] Added github_url to lessons");
    }

    // 2. Tables
    await conn.query(`
      CREATE TABLE IF NOT EXISTS exams (
        id INT AUTO_INCREMENT PRIMARY KEY,
        lesson_id INT NOT NULL,
        title VARCHAR(255),
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (lesson_id)
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS exam_questions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        exam_id INT NOT NULL,
        question_type ENUM('mcq', 'checkbox', 'fitb', 'challenge') NOT NULL,
        question_text TEXT NOT NULL,
        points INT DEFAULT 0,
        challenge_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (exam_id)
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS exam_options (
        id INT AUTO_INCREMENT PRIMARY KEY,
        question_id INT NOT NULL,
        option_text TEXT NOT NULL,
        is_correct BOOLEAN DEFAULT FALSE,
        INDEX (question_id)
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS lesson_completion (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        lesson_id INT NOT NULL,
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY user_lesson (user_id, lesson_id),
        INDEX (user_id),
        INDEX (lesson_id)
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS exam_submissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        exam_id INT NOT NULL,
        question_id INT NOT NULL,
        answer_text TEXT,
        is_correct BOOLEAN DEFAULT FALSE,
        points_awarded INT DEFAULT 0,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (user_id),
        INDEX (exam_id)
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS challenge_urls (
        id INT AUTO_INCREMENT PRIMARY KEY,
        challenge_id INT NOT NULL,
        url VARCHAR(500) NOT NULL,
        display_name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (challenge_id)
      )
    `);
    
    await conn.query(`
      CREATE TABLE IF NOT EXISTS challenge_flags (
        id INT AUTO_INCREMENT PRIMARY KEY,
        challenge_id INT NOT NULL,
        flag VARCHAR(255) NOT NULL,
        is_case_insensitive BOOLEAN DEFAULT FALSE,
        allow_variations BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (challenge_id)
      )
    `);

    // 3. One-time flag migration
    const [flags]: any = await conn.query("SELECT COUNT(*) as count FROM challenge_flags");
    if (flags[0].count === 0) {
      const [rows]: any = await conn.query("SELECT id, flag FROM challenges WHERE flag IS NOT NULL AND flag != ''");
      for (const row of rows) {
        await conn.query("INSERT INTO challenge_flags (challenge_id, flag) VALUES (?, ?)", [row.id, row.flag]);
      }
      console.log(`[DB] Migrated ${rows.length} flags`);
    }

    conn.release();
    console.log("[DB] Auto-migration complete");
  } catch (err: any) {
    console.error("[DB] Migration error:", err.message);
  }
}

// Run init in background
initDb();

export const ctfdPool = process.env.CTFD_DATABASE_URL
  ? mysql.createPool({
      uri: process.env.CTFD_DATABASE_URL,
      ssl: (process.env.CTFD_DATABASE_URL || '').includes('ssl=') || (process.env.CTFD_DATABASE_URL || '').includes('tidbcloud.com') ? {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: (process.env.CTFD_DATABASE_URL || '').includes('rejectUnauthorized=true') || (process.env.CTFD_DATABASE_URL || '').includes('tidbcloud.com'),
      } : undefined,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
    })
  : null;

export default pool;
