import Franchise from 'madden-franchise';
import { tableByName } from '../lib/franchiseRefs.ts';

const savePath = 'C:\\Users\\User\\Documents\\EA SPORTS College Football 27\\saves\\DYNASTY-SJSUTEST-AUTOSAVE';
const franchise = await Franchise.create(savePath, { autoParse: true });

const teamTable = tableByName(franchise, 'Team');
await teamTable.readRecords(['DisplayName', 'TeamIndex']);

const trackingTables = franchise.tables.filter(t => t.name === 'MySchoolTrackingTable');
const tracking = trackingTables[0];
await tracking.readRecords(['AthleticFacilitiesGrade', 'AthleticFacilitiesScore']);

// Print team TeamIndex vs tracking row for first 10 teams
console.log('Team table entries (first 15 non-empty):');
let n = 0;
for (const rec of teamTable.records) {
  if (rec.isEmpty || !rec.DisplayName) continue;
  if (n++ >= 15) break;
  const teamIdx = rec.TeamIndex;
  const trackingRec = tracking.records[teamIdx];
  const grade = trackingRec?.AthleticFacilitiesGrade ?? 'NO ROW';
  const score = trackingRec?.AthleticFacilitiesScore ?? 'NO ROW';
  console.log(`  TeamIndex=${teamIdx} name=${rec.DisplayName} → grade=${grade} score=${score}`);
}
