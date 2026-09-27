const https = require('https');
const fs = require('fs');
const path = require('path');

const TURSO_URL = 'https://cyber-note-khoadd.aws-ap-northeast-1.turso.io/v2/pipeline';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTA1MDA3NTksImlkIjoiMDFhMGUyMjktNGUwMS03NWE5LWFhNWQtMmYzYWQ0MzBmYTg3Iiwia2lkIjoiWXJESXFHeGFDSkRRVHdNMDdmcVgxU25SV1lPblQ5QUhQRmt6SVFoYy1QayIsInJpZCI6IjZlMDY1YjI2LTRlNTgtNDQ2ZC1iMmZjLWJlYjQwMjc4YTIyZSJ9.xMG5RPJoxZ0t0JO6ZjsCUD2JqHFRlibeExBYMEJ_reeRNv31nXp09XTPMW5VV47Wncn5FhKwm9AAc-vt3KbOBw';

function queryTurso(requests) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ requests: [...requests, { type: 'close' }] });
    const req = https.request(TURSO_URL, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + TURSO_TOKEN,
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch(e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function run() {
  console.log('Reading seed data...');
  const seedFile = path.join(__dirname, '..', 'js', 'seed-data.js');
  const code = fs.readFileSync(seedFile, 'utf8');
  const match = code.match(/var b64Data = "([^"]+)"/);
  if (!match) throw new Error('Could not find b64Data in seed-data.js');
  
  const jsonStr = Buffer.from(match[1], 'base64').toString('utf8');
  const seed = JSON.parse(jsonStr);

  console.log(`Parsed seed: ${seed.categories.length} categories, ${seed.entries.length} entries, ${(seed.documents || []).length} documents`);

  console.log('Creating tables if not exists...');
  await queryTurso([
    { type: 'execute', stmt: { sql: 'CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, name TEXT NOT NULL, desc TEXT);' } },
    { type: 'execute', stmt: { sql: 'CREATE TABLE IF NOT EXISTS entries (id TEXT PRIMARY KEY, type TEXT NOT NULL, title TEXT NOT NULL, category_id TEXT, language TEXT, content TEXT, code TEXT, notes TEXT, tags TEXT, pinned INTEGER DEFAULT 0, is_knowledge INTEGER DEFAULT 0, created_at INTEGER, updated_at INTEGER);' } },
    { type: 'execute', stmt: { sql: 'CREATE TABLE IF NOT EXISTS documents (id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT, tags TEXT, content TEXT, created_at INTEGER, updated_at INTEGER);' } }
  ]);

  console.log('Clearing old data in Turso...');
  await queryTurso([
    { type: 'execute', stmt: { sql: 'DELETE FROM entries;' } },
    { type: 'execute', stmt: { sql: 'DELETE FROM documents;' } },
    { type: 'execute', stmt: { sql: 'DELETE FROM categories;' } }
  ]);

  console.log('Inserting categories...');
  const catReqs = seed.categories.map(c => ({
    type: 'execute',
    stmt: {
      sql: 'INSERT INTO categories (id, name, desc) VALUES (?, ?, ?);',
      args: [
        { type: 'text', value: c.id },
        { type: 'text', value: c.name || '' },
        { type: 'text', value: c.desc || '' }
      ]
    }
  }));
  await queryTurso(catReqs);

  console.log('Inserting entries in batches...');
  for (let i = 0; i < seed.entries.length; i += 20) {
    const batch = seed.entries.slice(i, i + 20);
    const entryReqs = batch.map(e => ({
      type: 'execute',
      stmt: {
        sql: 'INSERT INTO entries (id, type, title, category_id, language, content, code, notes, tags, pinned, is_knowledge, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
        args: [
          { type: 'text', value: String(e.id) },
          { type: 'text', value: String(e.type || 'command') },
          { type: 'text', value: String(e.title || '') },
          { type: 'text', value: String(e.categoryId || 'default') },
          { type: 'text', value: String(e.language || 'Linux') },
          { type: 'text', value: String(e.content || '') },
          { type: 'text', value: String(e.code || '') },
          { type: 'text', value: String(e.notes || '') },
          { type: 'text', value: JSON.stringify(e.tags || []) },
          { type: 'integer', value: e.pinned ? '1' : '0' },
          { type: 'integer', value: e.isKnowledge ? '1' : '0' },
          { type: 'integer', value: String(e.createdAt || Date.now()) },
          { type: 'integer', value: String(e.updatedAt || Date.now()) }
        ]
      }
    }));
    await queryTurso(entryReqs);
  }

  if (seed.documents && seed.documents.length) {
    console.log('Inserting documents...');
    const docReqs = seed.documents.map(d => ({
      type: 'execute',
      stmt: {
        sql: 'INSERT INTO documents (id, title, description, tags, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?);',
        args: [
          { type: 'text', value: String(d.id) },
          { type: 'text', value: String(d.title || '') },
          { type: 'text', value: String(d.description || '') },
          { type: 'text', value: JSON.stringify(d.tags || []) },
          { type: 'text', value: String(d.content || '') },
          { type: 'integer', value: String(d.createdAt || Date.now()) },
          { type: 'integer', value: String(d.updatedAt || Date.now()) }
        ]
      }
    }));
    await queryTurso(docReqs);
  }

  console.log('Checking counts...');
  const checkRes = await queryTurso([
    { type: 'execute', stmt: { sql: 'SELECT count(*) as count FROM categories;' } },
    { type: 'execute', stmt: { sql: 'SELECT count(*) as count FROM entries;' } },
    { type: 'execute', stmt: { sql: 'SELECT count(*) as count FROM documents;' } }
  ]);

  console.log('=== SUCCESS ===');
  console.log('Categories count:', checkRes.results[0].response.result.rows[0][0].value);
  console.log('Entries count:', checkRes.results[1].response.result.rows[0][0].value);
  console.log('Documents count:', checkRes.results[2].response.result.rows[0][0].value);
}

run().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
