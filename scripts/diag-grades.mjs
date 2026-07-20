import Franchise from 'madden-franchise';
import { parseRef, tableByName } from '../lib/franchiseRefs.ts';

const savePath = 'C:\\Users\\User\\Documents\\EA SPORTS College Football 27\\saves\\DYNASTY-LIBERTY-AUTOSAVE';
const franchise = await Franchise.create(savePath, { autoParse: true });

const teamTable = tableByName(franchise, 'Team');
await teamTable.readRecords();
await teamTable.readRecords(['DisplayName', 'MySchoolTrackingTable']);

// Find Liberty row
let libertyRef = null;
for (const r of teamTable.records) {
  if (r.isEmpty) continue;
  if (r.DisplayName === 'Liberty') { libertyRef = parseRef(r.MySchoolTrackingTable); break; }
}

if (!libertyRef) { console.log('Liberty not found'); process.exit(1); }

const target = franchise.tables.find(t => t.header?.tableId === libertyRef.tableId);
console.log(`MySchoolTrackingTable: ${target.name}, cap ${target.header.recordCapacity}`);
await target.readRecords();
const fields = target.offsetTable.map(o => o.name);
const gradeFields = fields.filter(f => /Grade$/i.test(f));
console.log(`\nGrade fields (${gradeFields.length}):`);
gradeFields.forEach(f => console.log(`  ${f}`));

// Read Liberty's row + show current values
await target.readRecords(fields);
const rec = target.records[libertyRef.row];
console.log(`\nLiberty's current grades:`);
for (const f of gradeFields) {
  console.log(`  ${f} = ${rec[f]}`);
}

// Collect enum values seen across all teams
const enumVals = new Set();
for (const r of target.records) {
  if (r.isEmpty) continue;
  for (const f of gradeFields) if (r[f]) enumVals.add(r[f]);
}
console.log(`\nDistinct grade enum values seen: ${[...enumVals].sort().join(', ')}`);

// Also check Player.RecruitingDealbreaker enum values
const playerTable = tableByName(franchise, 'Player');
await playerTable.readRecords(['RecruitingDealbreaker']);
const dbVals = new Set();
for (const p of playerTable.records) {
  if (p.isEmpty) continue;
  if (p.RecruitingDealbreaker) dbVals.add(p.RecruitingDealbreaker);
}
console.log(`\nRecruitingDealbreaker enum values: ${[...dbVals].sort().join(', ')}`);
