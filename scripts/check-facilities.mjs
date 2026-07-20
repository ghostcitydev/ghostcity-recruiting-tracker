import Database from 'better-sqlite3';
const db = new Database('prisma/dev.db');

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables.map(t => t.name).join(', '));

const maxYear = db.prepare('SELECT MAX(year) as y FROM "Season"').get();
console.log('Max year:', maxYear.y);

const rows = db.prepare(`
  SELECT t.name, s.gradeFacilities, s.facilitiesScore, s.gradeAcademic, s.coachName
  FROM "TeamSeasonStat" s
  JOIN "Team" t ON t.id = s."teamId"
  JOIN "Season" se ON se.id = s."seasonId"
  WHERE se.year = ?
  ORDER BY t.name
  LIMIT 10
`).all(maxYear.y);

for (const r of rows) {
  console.log(r.name.padEnd(25), 'facilities:', r.gradeFacilities ?? 'NULL', r.facilitiesScore ?? 'NULL', '| academic:', r.gradeAcademic ?? 'NULL', '| coach:', r.coachName ?? 'NULL');
}

const nullFac = db.prepare(`SELECT COUNT(*) as c FROM "TeamSeasonStat" s JOIN "Season" se ON se.id = s."seasonId" WHERE se.year = ? AND s.gradeFacilities IS NULL`).get(maxYear.y);
console.log('\nNULL facilities count:', nullFac.c);
