const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function checkTable() {
  const dbUrl = process.env.DATABASE_URL || '';
  const useSsl = dbUrl.includes('ssl=') || dbUrl.includes('tidbcloud.com');

  const connection = await mysql.createConnection({
    uri: dbUrl,
    ssl: useSsl ? {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: dbUrl.includes('rejectUnauthorized=true') || dbUrl.includes('tidbcloud.com'),
    } : undefined
  });
  
  const [columns] = await connection.query('SHOW COLUMNS FROM competition_achievements');
  console.log(JSON.stringify(columns, null, 2));
  await connection.end();
}

checkTable().catch(console.error);
