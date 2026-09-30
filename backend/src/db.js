// Tiny JSON-file persistence for alerts & incidents (swap with MongoDB/DynamoDB/RDS in production)
const fs = require('fs');
const path = require('path');
const DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const FILE = path.join(DIR, 'db.json');

let db = { alerts: [], incidents: [] };
try {
  fs.mkdirSync(DIR, { recursive: true });
  if (fs.existsSync(FILE)) db = JSON.parse(fs.readFileSync(FILE, 'utf8'));
} catch (e) {
  console.error('DB load failed, starting empty:', e.message);
}

function save() {
  try { fs.writeFileSync(FILE, JSON.stringify(db, null, 2)); }
  catch (e) { console.error('DB save failed:', e.message); }
}

module.exports = { db, save };
