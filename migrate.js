const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function migrate() {
  const dbUrl = process.env.DATABASE_URL || '';
  const useSsl = dbUrl.includes('ssl=') || dbUrl.includes('tidbcloud.com');

  const connection = await mysql.createConnection({
    uri: dbUrl,
    ssl: useSsl ? {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: dbUrl.includes('rejectUnauthorized=true') || dbUrl.includes('tidbcloud.com'),
    } : undefined
  });
  console.log('Connected to Database');

  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  
  // 1. Split schema into individual statements
  const statements = schema.split(';').filter(s => s.trim() !== '');

  // 2. Run all statements (CREATE TABLE IF NOT EXISTS and INSERT IGNORE are naturally idempotent)
  for (let statement of statements) {
    try {
      await connection.query(statement);
    } catch (err) {
      if (err.code !== 'ER_DUP_FIELDNAME' && err.code !== 'ER_TABLE_EXISTS_ERROR') {
        console.error('Error executing statement:', err.message);
      }
    }
  }

  // 3. Intelligent Column Sync
  // This part parses schema.sql to find columns and adds them if they are missing in the DB.
  const tableRegex = /CREATE TABLE IF NOT EXISTS\s+(\w+)\s*\(([\s\S]+?)\);/gi;
  let match;

  while ((match = tableRegex.exec(schema)) !== null) {
    const tableName = match[1];
    const columnDefinitions = match[2].split(',\n');

    for (let def of columnDefinitions) {
      const trimmedDef = def.trim();
      
      // Skip constraints like PRIMARY KEY, FOREIGN KEY, UNIQUE KEY, INDEX
      if (/^(PRIMARY|FOREIGN|UNIQUE|KEY|CONSTRAINT|INDEX)/i.test(trimmedDef) || trimmedDef === "") {
        continue;
      }

      // Extract column name (first word) and its definition (the rest)
      const colMatch = trimmedDef.match(/^(\w+)\s+([\s\S]+)$/);
      if (!colMatch) continue;

      const colName = colMatch[1];
      const colDetails = colMatch[2];

      try {
        // Check if column exists
        const [columns] = await connection.query(
          `SHOW COLUMNS FROM ${tableName} LIKE ?`,
          [colName]
        );

        if (columns.length === 0) {
          console.log(`Syncing schema: Adding column '${colName}' to table '${tableName}'...`);
          await connection.query(`ALTER TABLE ${tableName} ADD COLUMN ${colName} ${colDetails}`);
        }
      } catch (err) {
        // Skip errors (e.g. if table doesn't exist yet)
      }
    }
  }

  // 4. Special Case: Handling dropped columns or renames manually (Optional)
  // For now, we only support additive changes to respect the "Zero Data Loss" mandate.

  // 5. Special Case: Update notifications ENUM to include new notification types
  try {
    await connection.query(
      `ALTER TABLE notifications MODIFY COLUMN type ENUM('payment_rejected', 'payment_approved', 'premium_activated', 'system', 'event_update', 'resource_update', 'challenge_update', 'broadcast') DEFAULT 'system'`
    );
    console.log('Updated notifications type ENUM to include broadcast type');
  } catch (err) {
    console.log('notifications type ENUM already updated or does not need modification:', err.message);
  }

  // 5b. Add target_audience column to notifications if it doesn't exist
  try {
    await connection.query(
      `ALTER TABLE notifications ADD COLUMN target_audience ENUM('user', 'all_users', 'premium_users', 'non_premium_users') DEFAULT 'user' AFTER is_read`
    );
    console.log('Added target_audience column to notifications table');
  } catch (err) {
    console.log('target_audience column already exists or does not need modification:', err.message);
  }

  // 5c. Modify user_id to allow NULL for broadcast notifications
  try {
    await connection.query(
      `ALTER TABLE notifications MODIFY COLUMN user_id INT NULL DEFAULT NULL`
    );
    console.log('Updated user_id column to allow NULL values for broadcast notifications');
  } catch (err) {
    console.log('user_id column already updated:', err.message);
  }

  // 6. Special Case: Modify created_by_admin_id to allow NULL for auto-created payment codes
  try {
    await connection.query(
      `ALTER TABLE upgrade_codes MODIFY COLUMN created_by_admin_id INT NULL DEFAULT NULL`
    );
    console.log('Updated created_by_admin_id column to allow NULL values');
  } catch (err) {
    // Column might already be nullable
    if (err.code !== 'ER_DUP_FIELDNAME') {
      console.log('created_by_admin_id column already updated or does not need modification');
    }
  }

  // 7. Add slug and event_code columns to events table
  try {
    // Check if slug column exists
    const [slugCol] = await connection.query(
      `SHOW COLUMNS FROM events LIKE 'slug'`
    );
    if (slugCol.length === 0) {
      await connection.query(
        `ALTER TABLE events ADD COLUMN slug VARCHAR(255) AFTER type`
      );
      console.log('Added slug column to events table');
    }
  } catch (err) {
    console.log('slug column migration error:', err.message);
  }

  try {
    // Check if event_code column exists
    const [codeCol] = await connection.query(
      `SHOW COLUMNS FROM events LIKE 'event_code'`
    );
    if (codeCol.length === 0) {
      await connection.query(
        `ALTER TABLE events ADD COLUMN event_code VARCHAR(50) AFTER slug`
      );
      console.log('Added event_code column to events table');
    }
  } catch (err) {
    console.log('event_code column migration error:', err.message);
  }

  // 8. Add UNIQUE constraints to slug and event_code
  try {
    const [indices] = await connection.query(
      `SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
       WHERE TABLE_NAME = 'events' AND COLUMN_NAME = 'slug'`
    );
    if (indices.length === 0) {
      await connection.query(`ALTER TABLE events ADD UNIQUE KEY unique_slug (slug)`);
      console.log('Added UNIQUE constraint to slug column');
    }
  } catch (err) {
    console.log('slug UNIQUE constraint already exists or error:', err.message);
  }

  try {
    const [indices] = await connection.query(
      `SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
       WHERE TABLE_NAME = 'events' AND COLUMN_NAME = 'event_code'`
    );
    if (indices.length === 0) {
      await connection.query(`ALTER TABLE events ADD UNIQUE KEY unique_event_code (event_code)`);
      console.log('Added UNIQUE constraint to event_code column');
    }
  } catch (err) {
    console.log('event_code UNIQUE constraint already exists or error:', err.message);
  }

  // 9. Fix alumni table - rename current_role to role_title and add session column
  try {
    const [columns] = await connection.query(
      `SHOW COLUMNS FROM alumni LIKE 'current_role'`
    );
    if (columns.length > 0) {
      await connection.query(
        `ALTER TABLE alumni CHANGE COLUMN current_role role_title VARCHAR(255)`
      );
      console.log('Renamed current_role to role_title in alumni table');
    }
  } catch (err) {
    console.log('Alumni column rename or already done:', err.message);
  }

  // 10. Add session column to alumni if it doesn't exist
  try {
    const [columns] = await connection.query(
      `SHOW COLUMNS FROM alumni LIKE 'session'`
    );
    if (columns.length === 0) {
      await connection.query(
        `ALTER TABLE alumni ADD COLUMN session VARCHAR(50) DEFAULT '2021-2022' AFTER graduation_year`
      );
      console.log('Added session column to alumni table');
    }
  } catch (err) {
    console.log('Session column already exists or error:', err.message);
  }

  // 11. Support Base64 images - change photo_url/image_url columns to LONGTEXT
  const imageColumns = [
    { table: 'executives', column: 'photo_url' },
    { table: 'alumni', column: 'role_title', isRenameCheck: true }, // Skip, was checking if I should include role_title
    { table: 'alumni', column: 'photo_url' },
    { table: 'contests', column: 'photo_url' },
    { table: 'lessons', column: 'image_url' },
    { table: 'events', column: 'photo_url' }
  ].filter(c => !c.isRenameCheck);

  for (const { table, column } of imageColumns) {
    try {
      await connection.query(
        `ALTER TABLE ${table} MODIFY COLUMN ${column} LONGTEXT`
      );
      console.log(`Updated ${table}.${column} to LONGTEXT for Base64 support`);
    } catch (err) {
      console.log(`Failed to update ${table}.${column}:`, err.message);
    }
  }

  // 12. Add target_audience to events if it doesn't exist
  try {
    const [columns] = await connection.query(
      `SHOW COLUMNS FROM events LIKE 'target_audience'`
    );
    if (columns.length === 0) {
      await connection.query(
        `ALTER TABLE events ADD COLUMN target_audience ENUM('free', 'premium', 'all') DEFAULT 'all' AFTER is_premium`
      );
      console.log('Added target_audience column to events table');
    }
  } catch (err) {
    console.log('target_audience column migration error:', err.message);
  }

  // 13. Add gallery_images to events if it doesn't exist
  try {
    const [columns] = await connection.query(
      `SHOW COLUMNS FROM events LIKE 'gallery_images'`
    );
    if (columns.length === 0) {
      await connection.query(
        `ALTER TABLE events ADD COLUMN gallery_images LONGTEXT AFTER photo_url`
      );
      console.log('Added gallery_images column to events table');
    }
  } catch (err) {
    console.log('gallery_images column migration error:', err.message);
  }

  // 14. Add gallery_images to competition_achievements if it doesn't exist
  try {
    const [columns] = await connection.query(
      `SHOW COLUMNS FROM competition_achievements LIKE 'gallery_images'`
    );
    if (columns.length === 0) {
      await connection.query(
        `ALTER TABLE competition_achievements ADD COLUMN gallery_images LONGTEXT AFTER description`
      );
      console.log('Added gallery_images column to competition_achievements table');
    }
  } catch (err) {
    console.log('competition_achievements gallery_images column migration error:', err.message);
  }

  // 15. Add is_team_contest to competition_achievements if it doesn't exist
  try {
    const [columns] = await connection.query(
      `SHOW COLUMNS FROM competition_achievements LIKE 'is_team_contest'`
    );
    if (columns.length === 0) {
      await connection.query(
        `ALTER TABLE competition_achievements ADD COLUMN is_team_contest BOOLEAN DEFAULT TRUE AFTER team_members`
      );
      console.log('Added is_team_contest column to competition_achievements table');
    }
  } catch (err) {
    console.log('competition_achievements is_team_contest column migration error:', err.message);
  }

  // 16. Add exclusivity_expires_at to events if it doesn't exist
  try {
    const [columns] = await connection.query(
      `SHOW COLUMNS FROM events LIKE 'exclusivity_expires_at'`
    );
    if (columns.length === 0) {
      await connection.query(
        `ALTER TABLE events ADD COLUMN exclusivity_expires_at TIMESTAMP NULL AFTER gallery_images`
      );
      console.log('Added exclusivity_expires_at column to events table');
    }
  } catch (err) {
    console.log('exclusivity_expires_at column migration error:', err.message);
  }

  // 17. Add convert_to_contest to events if it doesn't exist
  try {
    const [columns] = await connection.query(
      `SHOW COLUMNS FROM events LIKE 'convert_to_contest'`
    );
    if (columns.length === 0) {
      await connection.query(
        `ALTER TABLE events ADD COLUMN convert_to_contest BOOLEAN DEFAULT FALSE AFTER is_active`
      );
      console.log('Added convert_to_contest column to events table');
    }
  } catch (err) {
    console.log('convert_to_contest column migration error:', err.message);
  }

  // 17b. Add is_converted to events if it doesn't exist
  try {
    const [columns] = await connection.query(
      `SHOW COLUMNS FROM events LIKE 'is_converted'`
    );
    if (columns.length === 0) {
      await connection.query(
        `ALTER TABLE events ADD COLUMN is_converted BOOLEAN DEFAULT FALSE AFTER convert_to_contest`
      );
      console.log('Added is_converted column to events table');
    }
  } catch (err) {
    console.log('is_converted column migration error:', err.message);
  }

  // 18. Create teams table if not exists
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS teams (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('Created teams table');
  } catch (err) {
    console.log('teams table creation error:', err.message);
  }

  // 18. Create team_members table if not exists
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS team_members (
        id INT AUTO_INCREMENT PRIMARY KEY,
        team_id INT NOT NULL,
        user_id INT NOT NULL,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user (user_id),
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('Created team_members table');
  } catch (err) {
    console.log('team_members table creation error:', err.message);
  }

  // 19. Add team_id and ctftime_event_id to contests table
  try {
    const [teamIdCol] = await connection.query(
      `SHOW COLUMNS FROM contests LIKE 'team_id'`
    );
    if (teamIdCol.length === 0) {
      await connection.query(
        `ALTER TABLE contests ADD COLUMN team_id INT NULL AFTER details`
      );
      console.log('Added team_id column to contests table');
    }
  } catch (err) {
    console.log('team_id column migration error:', err.message);
  }

  try {
    const [ctfCol] = await connection.query(
      `SHOW COLUMNS FROM contests LIKE 'ctftime_event_id'`
    );
    if (ctfCol.length === 0) {
      await connection.query(
        `ALTER TABLE contests ADD COLUMN ctftime_event_id INT NULL AFTER team_id`
      );
      console.log('Added ctftime_event_id column to contests table');
    }
  } catch (err) {
    console.log('ctftime_event_id column migration error:', err.message);
  }

  // Add unique constraint on ctftime_event_id
  try {
    const [existing] = await connection.query(
      `SHOW KEYS FROM contests WHERE Key_name = 'unique_ctftime_event'`
    );
    if (existing.length === 0) {
      await connection.query(
        `ALTER TABLE contests ADD UNIQUE KEY unique_ctftime_event (ctftime_event_id)`
      );
      console.log('Added unique constraint on contests.ctftime_event_id');
    }
  } catch (err) {
    console.log('unique_ctftime_event constraint:', err.message);
  }
  // Add FK for team_id if not exists
  try {
    await connection.query(
      `ALTER TABLE contests ADD CONSTRAINT fk_contest_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL`
    );
    console.log('Added FK constraint on contests.team_id');
  } catch (err) {
    if (!err.message.includes('Duplicate foreign key') && !err.message.includes('already exists')) {
      console.log('FK constraint message:', err.message);
    }
  }

  // 20. Add ctftime_team_id to teams table
  try {
    const [ctfCol] = await connection.query(
      `SHOW COLUMNS FROM teams LIKE 'ctftime_team_id'`
    );
    if (ctfCol.length === 0) {
      await connection.query(
        `ALTER TABLE teams ADD COLUMN ctftime_team_id INT NULL AFTER description`
      );
      console.log('Added ctftime_team_id column to teams table');
    }
  } catch (err) {
    console.log('ctftime_team_id column migration error:', err.message);
  }

  // 21. Add CTFtime cache columns to teams table
  const ctftimeCacheColumns = [
    { name: 'ctftime_logo', definition: 'VARCHAR(500) NULL' },
    { name: 'ctftime_country', definition: 'VARCHAR(100) NULL' },
    { name: 'ctftime_primary_alias', definition: 'VARCHAR(255) NULL' },
    { name: 'ctftime_rating', definition: 'JSON NULL' },
    { name: 'ctftime_last_fetched', definition: 'DATETIME NULL' },
    { name: 'ctftime_members', definition: 'JSON NULL' },
  ];
  for (const col of ctftimeCacheColumns) {
    try {
      const [existing] = await connection.query(
        `SHOW COLUMNS FROM teams LIKE ?`, [col.name]
      );
      if (existing.length === 0) {
        await connection.query(
          `ALTER TABLE teams ADD COLUMN ${col.name} ${col.definition} AFTER ctftime_team_id`
        );
        console.log(`Added ${col.name} column to teams table`);
      }
    } catch (err) {
      console.log(`${col.name} column migration: `, err.message);
    }
  }

  // 22. Enforce one user per team: replace composite unique with single user_id unique
  try {
    const [constraints] = await connection.query(
      `SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
       WHERE TABLE_NAME = 'team_members' AND COLUMN_NAME = 'user_id'
       AND TABLE_SCHEMA = (SELECT DATABASE())`
    );
    // Drop old composite unique if it exists
    try {
      await connection.query(`ALTER TABLE team_members DROP INDEX unique_team_user`);
      console.log('Dropped old composite unique_team_user constraint');
    } catch (err) {
      // Index may not exist
    }
    // Add unique on user_id if not already present
    try {
      await connection.query(`ALTER TABLE team_members ADD UNIQUE KEY unique_user (user_id)`);
      console.log('Added unique_user constraint on user_id');
    } catch (err) {
      if (err.code !== 'ER_DUP_KEYNAME' && !err.message.includes('Duplicate key name')) {
        console.log('unique_user constraint message:', err.message);
      }
    }
  } catch (err) {
    console.log('team_members constraint migration:', err.message);
  }

  // 23. Remove unique constraint on ctftime_event_id to allow multi-team assignments
  try {
    const [existing] = await connection.query(
      `SHOW KEYS FROM contests WHERE Key_name = 'unique_ctftime_event'`
    );
    if (existing.length > 0) {
      await connection.query(
        `ALTER TABLE contests DROP INDEX unique_ctftime_event`
      );
      console.log('Dropped unique constraint unique_ctftime_event on contests.ctftime_event_id');
    }
  } catch (err) {
    console.log('unique_ctftime_event drop:', err.message);
  }

  // 24. Create resource_completions table for tracking user progress
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS resource_completions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        resource_id INT NOT NULL,
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY user_resource (user_id, resource_id),
        INDEX (user_id),
        INDEX (resource_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
      )
    `);
    console.log('Created resource_completions table');
  } catch (err) {
    console.log('resource_completions table creation error:', err.message);
  }

  // 25. Create password_reset_tokens table
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token VARCHAR(255) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        used_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_token (token),
        INDEX idx_user_id (user_id)
      )
    `);
    console.log('Created password_reset_tokens table');
  } catch (err) {
    console.log('password_reset_tokens table creation error:', err.message);
  }

  // 26. Add FK for password_reset_tokens if not exists
  try {
    await connection.query(
      `ALTER TABLE password_reset_tokens ADD CONSTRAINT fk_password_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`
    );
    console.log('Added FK constraint on password_reset_tokens.user_id');
  } catch (err) {
    if (!err.message.includes('Duplicate foreign key') && !err.message.includes('already exists')) {
      console.log('FK constraint message:', err.message);
    }
  }

  // 27. Add rejection_reason column to users table
  try {
    const [reasonCol] = await connection.query(
      `SHOW COLUMNS FROM users LIKE 'rejection_reason'`
    );
    if (reasonCol.length === 0) {
      await connection.query(
        `ALTER TABLE users ADD COLUMN rejection_reason TEXT AFTER status`
      );
      console.log('Added rejection_reason column to users table');
    }
  } catch (err) {
    console.log('rejection_reason column migration error:', err.message);
  }

  // 28. Add action column to resources table
  try {
    const [actionCol] = await connection.query(
      `SHOW COLUMNS FROM resources LIKE 'action'`
    );
    if (actionCol.length === 0) {
      await connection.query(
        `ALTER TABLE resources ADD COLUMN action VARCHAR(50) DEFAULT 'Read' AFTER category`
      );
      console.log('Added action column to resources table');
    }
  } catch (err) {
    console.log('action column migration error:', err.message);
  }

  console.log('Migration synchronized successfully');
  await connection.end();
}

migrate().catch(console.error);
