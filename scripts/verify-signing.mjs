import Franchise from 'madden-franchise';
import { parseRef } from '../lib/franchiseRefs.ts';

const savePath = 'C:\\Users\\User\\Documents\\EA SPORTS College Football 27\\saves\\DYNASTY-SJSUTEST-AUTOSAVE';
const franchise = await Franchise.create(savePath, { autoParse: true });

// Load team names
const teamTable = franchise.tables.find(t => t.name === 'Team');
await teamTable.readRecords(['DisplayName', 'TeamIndex']);
const teamByIndex = new Map();
for (const r of teamTable.records) {
  if (r.isEmpty) continue;
  try { if (r.DisplayName) teamByIndex.set(r.TeamIndex, r.DisplayName); } catch {}
}

// Load ProspectTargetSchool
const ptsTable = franchise.tables.find(t => t.name === 'ProspectTargetSchool');
await ptsTable.readRecords();

// Load Player for star ratings
const pt = franchise.tables.find(t => t.name === 'Player');
await pt.readRecords(['ProspectStarRating']);

// Load Recruit table
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

// For each signed recruit, find which team they signed with
const signed = rt.records.filter(r => !r.isEmpty && r.RecruitStage === 'Signed');
console.log('Total signed recruits:', signed.length);

const perTeam = new Map(); // TeamIndex -> { total, fiveStars, fourStars, ... }

for (const rec of signed) {
  const tslRef = parseRef(rec.TopSchoolsList);
  if (!tslRef) continue;

  const tslTable = await getTable(tslRef.tableId);
  const tslRec = tslTable.records[tslRef.row];

  // Find the school with highest TeamInfluence
  let bestTeamId = -1;
  let bestInfluence = -1;

  for (const f of Object.keys(tslRec.fields)) {
    try {
      const schoolRef = parseRef(tslRec[f]);
      if (!schoolRef) continue;
      const schoolRec = ptsTable.records[schoolRef.row];
      if (!schoolRec || schoolRec.isEmpty) continue;

      const inf = schoolRec.TeamInfluence ?? 0;
      if (inf > bestInfluence) {
        bestInfluence = inf;
        bestTeamId = schoolRec.TeamId;
      }
    } catch {}
  }

  if (bestTeamId < 0) continue;

  if (!perTeam.has(bestTeamId)) {
    perTeam.set(bestTeamId, { total: 0, fiveStars: 0, fourStars: 0, threeStars: 0, twoStars: 0, oneStars: 0, hs: 0, transfer: 0 });
  }
  const b = perTeam.get(bestTeamId);
  b.total++;

  // Star rating from Player
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

  // HS vs Transfer from Class
  const cls = rec.Class ?? '';
  if (cls === 'HighSchool') b.hs++;
  else b.transfer++;
}

// Show results sorted by total, compare with screenshot
const sorted = [...perTeam.entries()].sort((a,b) => b[1].total - a[1].total);
console.log('\n--- Per-team signed recruits (via TopSchoolsList highest influence) ---');
for (const [ti, b] of sorted.slice(0, 20)) {
  const name = teamByIndex.get(ti) ?? `Index ${ti}`;
  console.log(`  ${name} (${ti}): ${b.total} (5★=${b.fiveStars}, 4★=${b.fourStars}, 3★=${b.threeStars}, 2★=${b.twoStars}, 1★=${b.oneStars}) HS=${b.hs} XFER=${b.transfer}`);
}

// Check Minnesota specifically (TeamIndex 28)
const mn = perTeam.get(28);
console.log('\nMinnesota (28):', mn);

// Check Tennessee (TeamIndex 16)
const tn = perTeam.get(16);
console.log('Tennessee (16):', tn);

console.log('\nTotal teams with recruits:', perTeam.size);
console.log('Total recruits assigned:', [...perTeam.values()].reduce((s, b) => s + b.total, 0));

process.exit(0);
