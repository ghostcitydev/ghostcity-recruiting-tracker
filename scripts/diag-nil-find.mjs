import Franchise from 'madden-franchise';
import { parseRef } from '../lib/franchiseRefs.ts';

const savePath = 'C:\\Users\\User\\Documents\\EA SPORTS College Football 27\\saves\\DYNASTY-SJSUTEST-AUTOSAVE';
const franchise = await Franchise.create(savePath, { autoParse: true });

const playerTable = franchise.tables.find(t => t.name === 'Player');
const recruitTable = franchise.tables.find(t => t.name === 'Recruit');

await playerTable.readRecords();
await recruitTable.readRecords();

// Find first HS 5-star recruit — the visible list shows values 280/270/260
// Look for any Player OR Recruit field with values in that range
await recruitTable.readRecords(['Player', 'RecruitStage', 'Class', 'NationalRank']);

// Read ALL fields on the top recruits
const targets = [];
for (const r of recruitTable.records) {
  if (r.isEmpty) continue;
  if (r.Class !== 'HighSchool') continue;
  const rank = r.NationalRank;
  if (rank > 30 || rank < 1) continue;
  const ref = parseRef(r.Player);
  if (!ref) continue;
  targets.push({ rank, playerRow: ref.row, recruitIdx: r.index });
}
targets.sort((a, b) => a.rank - b.rank);

// Read every Player field name
const playerFields = playerTable.offsetTable.map(o => o.name);
const recruitFields = recruitTable.offsetTable.map(o => o.name);
await playerTable.readRecords(playerFields);

console.log(`Checking ${targets.length} top-30 HS recruits for fields in the 200-300 range\n`);

// Look for fields where the values are in the 200-300 range across these recruits
const fieldCandidates = {};
for (const t of targets.slice(0, 10)) {
  const p = playerTable.records[t.playerRow];
  for (const f of playerFields) {
    const v = p[f];
    if (typeof v === 'number' && v >= 200 && v <= 400) {
      if (!fieldCandidates[f]) fieldCandidates[f] = [];
      fieldCandidates[f].push({ rank: t.rank, v });
    }
  }
}

console.log('=== Player fields with values 200-400 across top recruits ===');
for (const [f, vals] of Object.entries(fieldCandidates)) {
  if (vals.length >= 5) console.log(`  ${f}: ${vals.map(x => `#${x.rank}=${x.v}`).join(', ')}`);
}

// Also check Recruit table
const recCandidates = {};
await recruitTable.readRecords(recruitFields);
for (const t of targets.slice(0, 10)) {
  const r = recruitTable.records[t.recruitIdx];
  for (const f of recruitFields) {
    const v = r[f];
    if (typeof v === 'number' && v >= 200 && v <= 400) {
      if (!recCandidates[f]) recCandidates[f] = [];
      recCandidates[f].push({ rank: t.rank, v });
    }
  }
}

console.log('\n=== Recruit fields with values 200-400 across top recruits ===');
for (const [f, vals] of Object.entries(recCandidates)) {
  if (vals.length >= 5) console.log(`  ${f}: ${vals.map(x => `#${x.rank}=${x.v}`).join(', ')}`);
}
