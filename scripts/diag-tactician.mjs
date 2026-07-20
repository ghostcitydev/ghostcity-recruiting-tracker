import Franchise from 'madden-franchise';
import { parseRef, tableByName } from '../lib/franchiseRefs.ts';

const savePath = 'C:\\Users\\User\\Documents\\EA SPORTS College Football 27\\saves\\DYNASTY-SACSTATE-AUTOSAVE';
const franchise = await Franchise.create(savePath, { autoParse: true });

const coachTable = franchise.tables.find(t => t.name === 'Coach');
await coachTable.readRecords();
await coachTable.readRecords();

// Pick a high-boost coach (Ohio State, level ~80+) and a low-boost coach
const teamTable = tableByName(franchise, 'Team');
await teamTable.readRecords();
await teamTable.readRecords(['DisplayName', 'PrestigeRank', 'HeadCoach']);

const targets = ['Ohio State', 'South Carolina', 'Sac State', 'Kent State', 'Sam Houston'];
const coachRefs = new Map();
for (const t of teamTable.records) {
  if (t.isEmpty || t.PrestigeRank === 255) continue;
  if (!targets.includes(t.DisplayName)) continue;
  const ref = parseRef(t.HeadCoach);
  if (ref) coachRefs.set(t.DisplayName, ref);
}

// Follow ActiveTalentTree ref for each
await coachTable.readRecords(['Level', 'ActiveTalentTree', 'FirstName', 'LastName']);

for (const [name, ref] of coachRefs) {
  const coach = coachTable.records[ref.row];
  if (!coach || coach.isEmpty) continue;
  const ttRef = parseRef(coach.ActiveTalentTree);
  console.log(`\n=== ${name} (${coach.FirstName} ${coach.LastName}, L${coach.Level}) ===`);
  console.log(`  ActiveTalentTree ref: ${coach.ActiveTalentTree}`);
  if (!ttRef) continue;
  const table = franchise.tables.find(t => t.header?.tableId === ttRef.tableId);
  if (!table) { console.log(`  Table id ${ttRef.tableId} not found`); continue; }
  console.log(`  -> Table: ${table.name} (cap ${table.header.recordCapacity})`);
  await table.readRecords();
  const fields = table.offsetTable.map(o => o.name);
  if (name === 'Ohio State') {
    console.log(`  Fields (${fields.length}): ${fields.join(', ')}`);
  }
  await table.readRecords(fields);
  const rec = table.records[ttRef.row];
  if (!rec || rec.isEmpty) { console.log('  Row empty'); continue; }
  const nonzero = [];
  for (const f of fields) {
    const v = rec[f];
    if (v == null || v === '' || v === 0 || v === false) continue;
    if (typeof v === 'string' && v.length > 40) continue;
    nonzero.push(`${f}=${v}`);
  }
  console.log(`  Non-zero fields: ${nonzero.join(', ')}`);
}
