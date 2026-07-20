import Franchise from 'madden-franchise';
import { tableByName } from '../lib/franchiseRefs.ts';

const savePath = 'C:\\Users\\User\\Documents\\EA SPORTS College Football 27\\saves\\DYNASTY-SJSUTEST-AUTOSAVE';
const franchise = await Franchise.create(savePath, { autoParse: true });

const teamTable = tableByName(franchise, 'Team');
await teamTable.readRecords();
await teamTable.readRecords(['DisplayName', 'TeamPrestige', 'PrestigeRank', 'TeamRank', 'IsUserControlled']);

const rows = [];
console.log(`Table capacity: ${teamTable.header?.recordCapacity}, records length: ${teamTable.records.length}`);
let empty = 0, noPrestige = 0;
for (const r of teamTable.records) {
  if (r.isEmpty) { empty++; continue; }
  if (r.TeamPrestige == null) { noPrestige++; }
  rows.push({ name: r.DisplayName || '(no name)', prestige: r.TeamPrestige, pRank: r.PrestigeRank, tRank: r.TeamRank });
}
console.log(`Empty: ${empty}, no prestige: ${noPrestige}, kept: ${rows.length}`);

rows.sort((a, b) => b.prestige - a.prestige);
const prestiges = rows.map(r => r.prestige);
console.log(`Total teams: ${rows.length}`);
console.log(`Prestige range: ${Math.min(...prestiges)} - ${Math.max(...prestiges)}`);
console.log(`\nTop 10:`);
rows.slice(0, 10).forEach(r => console.log(`  ${r.name}: prestige=${r.prestige}, pRank=${r.pRank}, tRank=${r.tRank}`));
console.log(`\nBottom 5:`);
rows.slice(-5).forEach(r => console.log(`  ${r.name}: prestige=${r.prestige}, pRank=${r.pRank}, tRank=${r.tRank}`));
