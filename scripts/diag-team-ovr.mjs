import Franchise from 'madden-franchise';
import { tableByName } from '../lib/franchiseRefs.ts';

const savePath = 'C:\\Users\\User\\Documents\\EA SPORTS College Football 27\\saves\\DYNASTY-SACSTATE-AUTOSAVE';
const franchise = await Franchise.create(savePath, { autoParse: true });

const teamTable = tableByName(franchise, 'Team');
await teamTable.readRecords();
const fields = teamTable.offsetTable.map(o => o.name).filter(f => /rating|ovr|off|def/i.test(f) && !f.includes('Contract') && !f.includes('Ability'));
console.log('Rating-ish fields on Team:', fields);

await teamTable.readRecords(['DisplayName', 'PrestigeRank', ...fields]);
for (const r of teamTable.records) {
  if (r.isEmpty || r.PrestigeRank === 255) continue;
  if (r.DisplayName === 'Cincinnati' || r.DisplayName === 'Sac State' || r.DisplayName === 'Sacramento State') {
    console.log(`\n=== ${r.DisplayName} ===`);
    for (const f of fields) console.log(`  ${f} = ${r[f]}`);
  }
}

// Also check Player OVR distribution for Cincinnati
const playerTable = tableByName(franchise, 'Player');
await playerTable.readRecords(['TeamIndex', 'OverallRating', 'FirstName', 'LastName']);

// Find Cincinnati's TeamIndex
const cincy = teamTable.records.find(r => !r.isEmpty && r.DisplayName === 'Cincinnati');
if (cincy) {
  await teamTable.readRecords(['TeamIndex']);
  const cincyIdx = cincy.TeamIndex;
  const cincyPlayers = playerTable.records.filter(p => !p.isEmpty && p.TeamIndex === cincyIdx);
  const ovrs = cincyPlayers.map(p => p.OverallRating).filter(v => typeof v === 'number').sort((a,b)=>b-a);
  console.log(`\nCincinnati (TeamIndex=${cincyIdx}) player count: ${cincyPlayers.length}`);
  console.log(`  Top 15 OVRs: ${ovrs.slice(0, 15).join(', ')}`);
  console.log(`  Bottom 5:    ${ovrs.slice(-5).join(', ')}`);
  console.log(`  Mean top 53: ${(ovrs.slice(0, 53).reduce((a,b)=>a+b,0)/Math.min(53,ovrs.length)).toFixed(1)}`);
}
