const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

// Section-header rows in the spreadsheet mark the start of a new category.
// They have an empty category column, a name, and no action.
const SECTION_HEADERS = new Set([
  'Cryptography',
  'Linux basics',
  'Crypto advance +Steganography + OSINT',
  'Memory Forensic',
  'Image (Autopsy) Forensic',
  'Network (Pcap) Forensic',
  'Malware Analysis',
  'Reverse Engineering',
  'PWN',
  'WEB',
  'VAPT and Machine Hacking',
]);

function deriveTitle(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    if (host === 'youtu.be' || host === 'youtube.com') return 'YouTube';
    if (host === 'terabox.com' || host === 'terabox.app') return 'Terabox recording';
    const segs = u.pathname.split('/').filter(Boolean);
    const last = segs[segs.length - 1]
      ? decodeURIComponent(segs[segs.length - 1]).replace(/[_-]+/g, ' ').trim()
      : '';
    return last ? `${host} — ${last}` : host;
  } catch (e) {
    return url;
  }
}

function parseCsv(content) {
  const lines = content.split(/\r?\n/);
  return lines
    .filter((l) => l.trim() !== '')
    .map((line) => {
      const cells = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (ch === ',' && !inQuotes) {
          cells.push(cur);
          cur = '';
        } else {
          cur += ch;
        }
      }
      cells.push(cur);
      return cells.map((c) => c.trim());
    });
}

async function importData() {
  const dbUrl = process.env.DATABASE_URL || '';
  const useSsl = dbUrl.includes('ssl=') || dbUrl.includes('tidbcloud.com');

  const connection = await mysql.createConnection({
    uri: dbUrl,
    ssl: useSsl ? {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: dbUrl.includes('rejectUnauthorized=true') || dbUrl.includes('tidbcloud.com'),
    } : undefined,
  });
  console.log('Connected to Database');

  // Load existing resources for idempotency
  const [existing] = await connection.query('SELECT id, title, url FROM resources');
  const existingByUrl = new Set();
  const existingByTitle = new Set();
  for (const r of existing) {
    if (r.url) existingByUrl.add(r.url);
    existingByTitle.add(r.title);
  }
  console.log(`Existing resources: ${existing.length}`);

  const content = fs.readFileSync('/tmp/opencode/resources.csv', 'utf8');
  const rows = parseCsv(content);
  const header = rows[0];
  console.log('Header:', header.slice(0, 3).join(' | '));

  let currentCategory = null;
  let imported = 0;
  let skipped = 0;
  const seenInRun = new Set();

  for (let i = 1; i < rows.length; i++) {
    const cat = (rows[i][0] || '').trim();
    const val = (rows[i][1] || '').trim();
    const action = (rows[i][2] || '').trim();

    if (!cat && !val && !action) continue;

    // Section header row → sets the active category
    if (!cat && val && !action && SECTION_HEADERS.has(val)) {
      currentCategory = val;
      continue;
    }

    // Data row (belongs to current section if category cell is empty)
    const category = cat || currentCategory || 'General';
    if (!val) {
      skipped++;
      continue;
    }

    let title;
    let url;
    if (/^https?:\/\//i.test(val)) {
      url = val;
      title = deriveTitle(val);
    } else {
      title = val;
      url = '';
    }

    const dedupeKey = url ? `url:${url}` : `title:${title}`;
    const alreadyInDb = url
      ? existingByUrl.has(url)
      : existingByTitle.has(title);

    if (alreadyInDb || seenInRun.has(dedupeKey)) {
      skipped++;
      continue;
    }
    seenInRun.add(dedupeKey);

    try {
      await connection.query(
        `INSERT INTO resources (title, description, url, category, action, is_external, is_premium, created_by_admin_id)
         VALUES (?, ?, ?, ?, ?, TRUE, TRUE, NULL)`,
        [title, '', url, category, action || 'Read']
      );
      imported++;
      console.log(`Imported [${category}]: ${title}`);
    } catch (err) {
      skipped++;
      console.error(`Error importing row ${i} (${title}):`, err.message);
    }
  }

  await connection.end();
  console.log(`\nImport finished: ${imported} imported, ${skipped} skipped`);
}

importData().catch(console.error);
