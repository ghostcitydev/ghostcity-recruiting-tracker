import Database from 'better-sqlite3';
const db = new Database('dev.db');  // root-level dev.db

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables.map(t => t.name).join(', '));

const cols = db.prepare("PRAGMA table_info('TeamSeasonStat')").all();
const colNames = cols.map(c => c.name);
console.log('\nTeamSeasonStat columns:', colNames.join(', '));

// Check if new columns exist
const newCols = ['gradeFacilities', 'facilitiesScore', 'gradeAcademic', 'coachName', 'coachLevel'];
for (const c of newCols) {
  console.log(`  ${c}:`, colNames.includes(c) ? 'EXISTS' : 'MISSING');
}

const maxYear = db.prepare('SELECT MAX(year) as y FROM "Season"').get();
console.log('\nMax year:', maxYear.y);

const rows = db.prepare(`
  SELECT t.name, s.gradeFacilities, s.facilitiesScore, s.gradeAcademic, s.coachName
  FROM "TeamSeasonStat" s
  JOIN "Team" t ON t.id = s."teamId"
  JOIN "Season" se ON se.id = s."seasonId"
  WHERE se.year = ?
  ORDER BY t.name
  LIMIT 8
`).all(maxYear.y);

for (const r of rows) {
  console.log(r.name.padEnd(25), 'fac:', r.gradeFacilities ?? 'NULL', r.facilitiesScore ?? 'NULL', '| acad:', r.gradeAcademic ?? 'NULL', '| coach:', r.coachName ?? 'NULL');
}
