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

// For first 10 signed recruits, show CommitScore and all schools' TeamInfluence
console.log('--- First 10 signed recruits: CommitScore vs school influences ---');
for (const rec of signed.slice(0, 10)) {
  const cs = rec.CommitScore;
  const tslRef = parseRef(rec.TopSchoolsList);
  if (!tslRef) continue;
  const tslTable = await getTable(tslRef.tableId);
  const tslRec = tslTable.records[tslRef.row];

  const schools = [];
  for (const f of Object.keys(tslRec.fields)) {
    try {
      const ref = parseRef(tslRec[f]);
      if (!ref) continue;
      const schoolRec = ptsTable.records[ref.row];
      if (!schoolRec) continue;
      schools.push({ team: teamByIndex.get(schoolRec.TeamId) ?? schoolRec.TeamId, influence: schoolRec.TeamInfluence });
    } catch {}
  }

  console.log(`\n  CommitScore=${cs}`);
  for (const s of schools) {
    const match = s.influence === cs ? ' *** MATCH ***' : (s.influence >= cs ? ' (>= commit)' : '');
    console.log(`    ${s.team}: ${s.influence}${match}`);
  }
}

process.exit(0);
