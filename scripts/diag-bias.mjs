import Franchise from 'madden-franchise';
import { tableByName } from '../lib/franchiseRefs.ts';

const savePath = 'C:\\Users\\User\\Documents\\EA SPORTS College Football 27\\saves\\DYNASTY-LIBERTY-AUTOSAVE';
const franchise = await Franchise.create(savePath, { autoParse: true });

const teamTable = tableByName(franchise, 'Team');
await teamTable.readRecords();
await teamTable.readRecords(['DisplayName', 'TeamPrestige', 'PrestigeRank', 'TeamPrestigeBias']);

const rows = [];
for (const r of teamTable.records) {
  if (r.isEmpty) continue;
  if (r.PrestigeRank === 255) continue;
  if (!r.DisplayName) continue;
  rows.push({ name: r.DisplayName, prestige: r.TeamPrestige, rank: r.PrestigeRank, bias: r.TeamPrestigeBias });
}

// Distribution of bias values
const dist = new Map();
for (const r of rows) dist.set(r.bias, (dist.get(r.bias) ?? 0) + 1);
console.log(`Total FBS teams: ${rows.length}`);
console.log(`\nTeamPrestigeBias distribution:`);
for (const [v, c] of [...dist].sort((a, b) => a[0] - b[0])) console.log(`  ${v}: ${c} teams`);

const nonZero = rows.filter(r => r.bias !== 0);
console.log(`\nNon-zero bias teams: ${nonZero.length}`);
nonZero.slice(0, 20).forEach(r => console.log(`  ${r.name}: bias=${r.bias}, prestige=${r.prestige}, rank=${r.rank}`));

// Prestige distribution
const pDist = new Map();
for (const r of rows) pDist.set(r.prestige, (pDist.get(r.prestige) ?? 0) + 1);
console.log(`\nTeamPrestige distribution:`);
for (const [v, c] of [...pDist].sort((a, b) => b[0] - a[0])) console.log(`  ${v}: ${c} teams`);

console.log(`\nTop 10 by prestige:`);
rows.sort((a, b) => a.rank - b.rank).slice(0, 10).forEach(r => console.log(`  #${r.rank} ${r.name}: prestige=${r.prestige}, bias=${r.bias}`));
