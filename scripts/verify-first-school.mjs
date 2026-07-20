import Franchise from 'madden-franchise';
import { parseRef } from '../lib/franchiseRefs.ts';

const savePath = 'C:\\Users\\User\\Documents\\EA SPORTS College Football 27\\saves\\DYNASTY-SJSUTEST-AUTOSAVE';
const franchise = await Franchise.create(savePath, { autoParse: true });

const teamTable = franchise.tables.find(t => t.name === 'Team');
await teamTable.readRecords(['DisplayName', 'TeamIndex']);
const teamByIndex = new Map();
for (const r of teamTable.records) {
  if (r.isEmpty) continue;
  try { if (r.DisplayName) teamByIndex.set(r.TeamIndex, r.DisplayName); } catch {}
}

const ptsTable = franchise.tables.find(t => t.name === 'ProspectTargetSchool');
await ptsTable.readRecords();

const pt = franchise.tables.find(t => t.name === 'Player');
await pt.readRecords(['ProspectStarRating']);

const rt = franchise.tables.find(t => t.name === 'Recruit');
await rt.readRecords();

const tableCache = new Map();
async function getTable(id) {
  if (!tableCache.has(id)) {
    const t = franchise.getTableById(id);
    await t.readRecords();
    tableCache.set(id, t);
  }
  return tableCache.get(id);
}

const signed = rt.records.filter(r => !r.isEmpty && r.RecruitStage === 'Signed');
const perTeam = new Map();

for (const rec of signed) {
  const tslRef = parseRef(rec.TopSchoolsList);
  if (!tslRef) continue;
  const tslTable = await getTable(tslRef.tableId);
  const tslRec = tslTable.records[tslRef.row];

  // Use first entry (ProspectTargetSchool0) = committed school
  let teamId = -1;
  try {
    const firstRef = parseRef(tslRec.ProspectTargetSchool0);
    if (firstRef) {
      const schoolRec = ptsTable.records[firstRef.row];
      if (schoolRec) teamId = schoolRec.TeamId;
    }
  } catch {}

  if (teamId < 0) continue;

  if (!perTeam.has(teamId)) {
    perTeam.set(teamId, { total: 0, fiveStars: 0, fourStars: 0, threeStars: 0, twoStars: 0, oneStars: 0, hs: 0, transfer: 0 });
  }
  const b = perTeam.get(teamId);
  b.total++;

  const playerRef = parseRef(rec.Player);
  if (playerRef) {
    const prec = pt.records[playerRef.row];
    if (prec) {
      const star = prec.ProspectStarRating;
      if (star === 'FIVE_STAR') b.fiveStars++;
      else if (star === 'FOUR_STAR') b.fourStars++;
      else if (star === 'THREE_STAR') b.threeStars++;
      else if (star === 'TWO_STAR') b.twoStars++;
      else if (star === 'ONE_STAR') b.oneStars++;
    }
  }

  const cls = rec.Class ?? '';
  if (cls === 'HighSchool') b.hs++;
  else b.transfer++;
}

// Expected from screenshot:
// Minnesota (28): 20 total, 0-5, 8-4, 8-3, 4-2, 0-1
// Tennessee (16): 22 total, 0-5, 20-4, 2-3, 0-2, 0-1

const mn = perTeam.get(28);
console.log('Minnesota (28):', mn, '| Expected: 20 (0/8/8/4/0)');
const tn = perTeam.get(16);
console.log('Tennessee (16):', tn, '| Expected: 22 (0/20/2/0/0)');

// Show sorted results
const sorted = [...perTeam.entries()].sort((a,b) => b[1].total - a[1].total);
console.log('\nTop 20:');
for (const [ti, b] of sorted.slice(0, 20)) {
  const name = teamByIndex.get(ti) ?? `Index ${ti}`;
  console.log(`  ${name}: ${b.total} (5★=${b.fiveStars}, 4★=${b.fourStars}, 3★=${b.threeStars}, 2★=${b.twoStars}, 1★=${b.oneStars})`);
}

console.log('\nTotal assigned:', [...perTeam.values()].reduce((s, b) => s + b.total, 0));
console.log('Teams:', perTeam.size);

process.exit(0);
