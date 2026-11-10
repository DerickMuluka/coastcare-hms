const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function reset() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  });
  const sql = fs.readFileSync(path.join(__dirname, 'coastcare_db.sql'), 'utf8');
  console.log('🔄 Recreating database from schema...');
  await conn.query(sql);
  console.log('✅ Database reset complete.');
  await conn.end();
}

reset().catch(e => { console.error('❌', e); process.exit(1); });