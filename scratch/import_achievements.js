const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function importData() {
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

  // 1. Clear current data
  console.log('Clearing current achievement data...');
  await connection.query('DELETE FROM competition_achievements');

  const csvPath = '/home/ki6uipar1na/.gemini/antigravity/brain/50816273-ab43-4892-bc7e-d8a3ae140357/.system_generated/steps/595/content.md';
  const content = fs.readFileSync(csvPath, 'utf8');
  
  const lines = content.split('\n').filter(line => line.trim() !== '');
  const dataLines = lines.slice(3); 

  for (let line of dataLines) {
    try {
      const parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
      if (!parts || parts.length < 3) continue;

      const clean = (str) => str ? str.replace(/^"|"$/g, '').trim() : '';
      
      const title = clean(parts[0]);
      const rawPosition = clean(parts[1]);
      const rawDate = clean(parts[2]);
      const members = clean(parts[4]);
      const teamName = clean(parts[5]);
      const rawPrize = clean(parts[6]);
      const imageUrl = clean(parts[7]);

      // Organize data to fit schema
      let position = null;
      const posLower = rawPosition.toLowerCase();
      if (posLower.includes('1st runner up') || posLower.includes('runner up')) {
         if (posLower.includes('1st')) position = 2;
         else if (posLower.includes('2nd')) position = 3;
         else if (posLower.includes('3rd')) position = 4;
         else position = 2; 
      } else {
        const match = rawPosition.match(/\d+/);
        if (match) position = parseInt(match[0]);
      }

      let prizeMoney = null;
      const prizeMatch = rawPrize.replace(/,/g, '').match(/\d+/);
      if (prizeMatch) prizeMoney = parseInt(prizeMatch[0]);

      let achievementDate = null;
      if (rawDate) {
        const dateParts = rawDate.split('-');
        if (dateParts.length === 3) {
          achievementDate = `${dateParts[2]}-${dateParts[0].padStart(2, '0')}-${dateParts[1].padStart(2, '0')}`;
        }
      }

      let description = `Official Position: ${rawPosition}`;
      if (rawPrize) description += ` | Prize: ${rawPrize}`;
      if (imageUrl) description += ` | Coverage: ${imageUrl}`;

      // User Rule: if solo contest then team name will be participant name
      // Logic: if teamName is empty, use members as teamName
      const finalTeamName = teamName || members || 'N/A';
      const isTeamContest = teamName ? 1 : 0;

      await connection.query(
        `INSERT INTO competition_achievements 
        (competition_name, contest_name, team_name, team_members, is_team_contest, position, prize_money, description, achievement_date) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          title, 
          title, 
          finalTeamName, 
          members, 
          isTeamContest, 
          position, 
          prizeMoney, 
          description, 
          achievementDate
        ]
      );
      console.log(`Imported: ${title} (${finalTeamName})`);

    } catch (err) {
      console.error(`Error importing line: ${line}`, err.message);
    }
  }

  await connection.end();
  console.log('Re-import finished');
}

importData().catch(console.error);
