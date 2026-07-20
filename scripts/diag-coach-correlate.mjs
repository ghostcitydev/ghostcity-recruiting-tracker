import Franchise from 'madden-franchise';
import { parseRef, tableByName } from '../lib/franchiseRefs.ts';

const savePath = 'C:\\Users\\User\\Documents\\EA SPORTS College Football 27\\saves\\DYNASTY-SACSTATE-AUTOSAVE';
const franchise = await Franchise.create(savePath, { autoParse: true });

const coachTable = franchise.tables.find(t => t.name === 'Coach');
await coachTable.readRecords();
await coachTable.readRecords(['Level', 'ExperiencePoints', 'CoachPrestige', 'ActiveTalentTree', 'Position', 'FirstName', 'LastName']);

const teamTable = tableByName(franchise, 'Team');
await teamTable.readRecords();
await teamTable.readRecords(['DisplayName', 'PrestigeRank', 'TeamPrestige', 'HeadCoach', 'TEAM_RATINGOVR']);

const playerTable = tableByName(franchise, 'Player');
await playerTable.readRecords(['TeamIndex', 'OverallRating']);

// Compute meanAll per team
const meanByIdx = new Map();
const sums = new Map(), counts = new Map();
for (const p of playerTable.records) {
  if (p.isEmpty || p.TeamIndex === 255) continue;
  if (typeof p.OverallRating !== 'number') continue;
  sums.set(p.TeamIndex, (sums.get(p.TeamIndex) ?? 0) + p.OverallRating);
  counts.set(p.TeamIndex, (counts.get(p.TeamIndex) ?? 0) + 1);
}
for (const [idx, s] of sums) meanByIdx.set(idx, s / counts.get(idx));

const rows = [];
for (const t of teamTable.records) {
  if (t.isEmpty || t.PrestigeRank === 255) continue;
  await teamTable.readRecords(['TeamIndex']);
  const mean = meanByIdx.get(t.TeamIndex);
  if (mean == null) continue;
  const ref = parseRef(t.HeadCoach);
  const coach = ref ? coachTable.records[ref.row] : null;
  rows.push({
    name: t.DisplayName,
    prestige: t.TeamPrestige,
    meanAll: Math.round(mean),
    teamOvr: t.TEAM_RATINGOVR,
    boost: t.TEAM_RATINGOVR - Math.round(mean),
    coachLevel: coach?.Level ?? null,
    coachXP: coach?.ExperiencePoints ?? null,
    coachPrestige: coach?.CoachPrestige ?? null,
  });
}

// Correlate boost with coach level
console.log('=== Boost vs coach level ===');
const byLevel = new Map();
for (const r of rows) {
  if (r.coachLevel == null) continue;
  const arr = byLevel.get(r.coachLevel) ?? [];
  arr.push(r.boost);
  byLevel.set(r.coachLevel, arr);
}
console.log('level, n, avgBoost, range');
for (const [lvl, arr] of [...byLevel].sort((a, b) => a[0] - b[0])) {
  const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
  console.log(`  L${lvl}, n=${arr.length}, avg=${avg.toFixed(1)}, [${Math.min(...arr)}, ${Math.max(...arr)}]`);
}

// Correlate boost with coach XP (grouped)
console.log('\n=== Boost vs coach XP (bucketed) ===');
const xpBuckets = new Map();
for (const r of rows) {
  if (r.coachXP == null) continue;
  const bucket = Math.floor(r.coachXP / 50000) * 50;
  const arr = xpBuckets.get(bucket) ?? [];
  arr.push(r.boost);
  xpBuckets.set(bucket, arr);
}
for (const [b, arr] of [...xpBuckets].sort((a, b) => a[0] - b[0])) {
  console.log(`  XP ${b}k+: n=${arr.length}, avg=${(arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(1)}`);
}

// Correlate boost with CoachPrestige
console.log('\n=== Boost vs CoachPrestige ===');
const byCP = new Map();
for (const r of rows) {
  if (!r.coachPrestige) continue;
  const arr = byCP.get(r.coachPrestige) ?? [];
  arr.push(r.boost);
  byCP.set(r.coachPrestige, arr);
}
for (const [cp, arr] of [...byCP]) {
  console.log(`  ${cp}: n=${arr.length}, avg=${(arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(1)}, [${Math.min(...arr)}, ${Math.max(...arr)}]`);
}

// Show top teams: prestige + coach level + boost
console.log('\n=== Top 15 by team prestige — coach level and boost ===');
rows.sort((a, b) => b.prestige - a.prestige);
for (const r of rows.slice(0, 15)) {
  console.log(`  ${r.name} pres=${r.prestige} coachLvl=${r.coachLevel} coachXP=${r.coachXP} coachPrestige=${r.coachPrestige} boost=${r.boost}`);
}
console.log('\n=== Bottom 10 by team prestige ===');
for (const r of rows.slice(-10)) {
  console.log(`  ${r.name} pres=${r.prestige} coachLvl=${r.coachLevel} coachXP=${r.coachXP} coachPrestige=${r.coachPrestige} boost=${r.boost}`);
}
