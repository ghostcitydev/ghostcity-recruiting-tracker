import Franchise from 'madden-franchise';
import { parseRef, tableByName } from '../lib/franchiseRefs.ts';

const savePath = 'C:\\Users\\User\\Documents\\EA SPORTS College Football 27\\saves\\DYNASTY-SJSUTEST-AUTOSAVE';
const franchise = await Franchise.create(savePath, { autoParse: true });

const pipelineTable = franchise.tables.filter(t => t.name === 'SchoolPipelineInfluence')[0];
await pipelineTable.readRecords();

const names = new Set();
for (const r of pipelineTable.records) {
  if (!r.isEmpty) names.add(r.Pipeline);
}
console.log('All pipeline names:', [...names].sort().join(', '));

// Also check Coach table for head coach by team
const coachTables = franchise.tables.filter(t => t.name === 'Coach' && t.isArray === false);
const mainCoachTable = coachTables.find(t => t.records.length > 100) ?? coachTables[0];
await mainCoachTable.readRecords(['FirstName','LastName','TeamIndex','Position','DominantArchetype','COACH_RATING','Level','PrimaryPipeline']);

console.log('\n=== HEAD COACHES (Position=HeadCoach) ===');
const headCoaches = mainCoachTable.records.filter(r => !r.isEmpty && r.Position === 'HeadCoach').slice(0, 10);
for (const c of headCoaches) {
  console.log(`TeamIdx ${c.TeamIndex}: ${c.FirstName} ${c.LastName} | Archetype: ${c.DominantArchetype} | Rating: ${c.COACH_RATING} | Level: ${c.Level} | PrimaryPipeline: ${c.PrimaryPipeline}`);
}
console.log('Total head coaches:', mainCoachTable.records.filter(r => !r.isEmpty && r.Position === 'HeadCoach').length);

// Check MySchoolTrackingTable for campus lifestyle score
const tracking = franchise.tables.filter(t => t.name === 'MySchoolTrackingTable')[0];
await tracking.readRecords();
const teamTable = tableByName(franchise, 'Team');
await teamTable.readRecords(['DisplayName','TeamIndex']);
const teamNames = new Map();
for (const t of teamTable.records) {
  if (!t.isEmpty && t.DisplayName) teamNames.set(t.TeamIndex, t.DisplayName);
}

console.log('\n=== SAMPLE TRACKING GRADES (Alabama=row 2) ===');
const alabamaRow = tracking.records[2];
if (alabamaRow) {
  const fields = Object.keys(alabamaRow.fields);
  for (const f of fields) {
    try {
      const v = alabamaRow[f];
      if (typeof v === 'string' || typeof v === 'number') {
        console.log(`  ${f} = ${v}`);
      }
    } catch {}
  }
}
