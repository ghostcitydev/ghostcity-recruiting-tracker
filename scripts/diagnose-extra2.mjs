import Franchise from 'madden-franchise';
import { parseRef, tableByName } from '../lib/franchiseRefs.ts';

const savePath = 'C:\\Users\\User\\Documents\\EA SPORTS College Football 27\\saves\\DYNASTY-SJSUTEST-AUTOSAVE';
const franchise = await Franchise.create(savePath, { autoParse: true });

const teamTable = tableByName(franchise, 'Team');
await teamTable.readRecords(['DisplayName', 'TeamIndex', 'CommittedPlayers']);

const pt = tableByName(franchise, 'Player');
await pt.readRecords(['ProspectStarRating', 'SchoolYear', 'FirstName', 'LastName', 'Position', 'Age']);

const rt = tableByName(franchise, 'Recruit');
await rt.readRecords(['Player', 'Class', 'RecruitStage']);
const playerToRecruit = new Map();
for (const rec of rt.records) {
  if (rec.isEmpty) continue;
  const ref = parseRef(rec.Player);
  if (ref) playerToRecruit.set(ref.row, rec);
}

const tableCache = new Map();
async function getTable(id) {
  if (!tableCache.has(id)) {
    const t = franchise.getTableById(id);
    await t.readRecords();
    tableCache.set(id, t);
  }
  return tableCache.get(id);
}

// Minnesota breakdown by class
for (const r of teamTable.records) {
  if (r.isEmpty || r.DisplayName !== 'Minnesota') continue;

  const cpRef = parseRef(r.CommittedPlayers);
  if (!cpRef) continue;
  const cpTable = await getTable(cpRef.tableId);
  const cpRec = cpTable.records[cpRef.row];

  const byClass = {};
  const starsByClass = {};
  for (const f of Object.keys(cpRec.fields)) {
    try {
      const val = cpRec[f];
      const ref = parseRef(val);
      if (!ref) continue;
      const prec = pt.records[ref.row];
      if (!prec || prec.isEmpty) continue;

      const recruit = playerToRecruit.get(ref.row);
      const cls = recruit?.Class ?? 'NO_RECRUIT';
      byClass[cls] = (byClass[cls] || 0) + 1;
      if (!starsByClass[cls]) starsByClass[cls] = { FIVE_STAR: 0, FOUR_STAR: 0, THREE_STAR: 0, TWO_STAR: 0, ONE_STAR: 0 };
      starsByClass[cls][prec.ProspectStarRating]++;
    } catch {}
  }

  console.log('Minnesota by class:');
  for (const [cls, count] of Object.entries(byClass)) {
    const stars = starsByClass[cls];
    console.log(`  ${cls}: ${count} (5★=${stars.FIVE_STAR} 4★=${stars.FOUR_STAR} 3★=${stars.THREE_STAR} 2★=${stars.TWO_STAR} 1★=${stars.ONE_STAR})`);
  }

  // The game shows 20 with 0/8/8/4/0. Our HS = 11 with some stars.
  // HS: count each star
  const hsPlayers = [];
  const xferPlayers = [];
  for (const f of Object.keys(cpRec.fields)) {
    try {
      const val = cpRec[f];
      const ref = parseRef(val);
      if (!ref) continue;
      const prec = pt.records[ref.row];
      if (!prec || prec.isEmpty) continue;
      const recruit = playerToRecruit.get(ref.row);
      const cls = recruit?.Class ?? '';
      if (cls === 'HighSchool') hsPlayers.push(prec);
      else xferPlayers.push(prec);
    } catch {}
  }

  console.log(`\nHS players (${hsPlayers.length}):`);
  const hsStars = { FIVE_STAR: 0, FOUR_STAR: 0, THREE_STAR: 0, TWO_STAR: 0, ONE_STAR: 0 };
  for (const p of hsPlayers) { hsStars[p.ProspectStarRating]++; }
  console.log(`  5★=${hsStars.FIVE_STAR} 4★=${hsStars.FOUR_STAR} 3★=${hsStars.THREE_STAR} 2★=${hsStars.TWO_STAR} 1★=${hsStars.ONE_STAR}`);

  console.log(`\nTransfer players (${xferPlayers.length}):`);
  const xStars = { FIVE_STAR: 0, FOUR_STAR: 0, THREE_STAR: 0, TWO_STAR: 0, ONE_STAR: 0 };
  for (const p of xferPlayers) { xStars[p.ProspectStarRating]++; }
  console.log(`  5★=${xStars.FIVE_STAR} 4★=${xStars.FOUR_STAR} 3★=${xStars.THREE_STAR} 2★=${xStars.TWO_STAR} 1★=${xStars.ONE_STAR}`);

  // Game shows: 0/8/8/4/0 = 20.
  // If we exclude JuniorCollege and Transfer_Junior:
  const filteredPlayers = [];
  for (const f of Object.keys(cpRec.fields)) {
    try {
      const val = cpRec[f];
      const ref = parseRef(val);
      if (!ref) continue;
      const prec = pt.records[ref.row];
      if (!prec || prec.isEmpty) continue;
      const recruit = playerToRecruit.get(ref.row);
      const cls = recruit?.Class ?? '';
      if (!cls.startsWith('JuniorCollege') && cls !== 'Transfer_Junior') {
        filteredPlayers.push(prec);
      }
    } catch {}
  }
  console.log(`\nExcluding JuniorCollege & Transfer_Junior (${filteredPlayers.length}):`);
  const fStars = { FIVE_STAR: 0, FOUR_STAR: 0, THREE_STAR: 0, TWO_STAR: 0, ONE_STAR: 0 };
  for (const p of filteredPlayers) { fStars[p.ProspectStarRating]++; }
  console.log(`  5★=${fStars.FIVE_STAR} 4★=${fStars.FOUR_STAR} 3★=${fStars.THREE_STAR} 2★=${fStars.TWO_STAR} 1★=${fStars.ONE_STAR}`);

  // If we only count HighSchool + Transfer_Freshman:
  const hsTfPlayers = [];
  for (const f of Object.keys(cpRec.fields)) {
    try {
      const val = cpRec[f];
      const ref = parseRef(val);
      if (!ref) continue;
      const prec = pt.records[ref.row];
      if (!prec || prec.isEmpty) continue;
      const recruit = playerToRecruit.get(ref.row);
      const cls = recruit?.Class ?? '';
      if (cls === 'HighSchool' || cls === 'Transfer_Freshman') {
        hsTfPlayers.push(prec);
      }
    } catch {}
  }
  console.log(`\nHS + Transfer_Freshman only (${hsTfPlayers.length}):`);
  const htStars = { FIVE_STAR: 0, FOUR_STAR: 0, THREE_STAR: 0, TWO_STAR: 0, ONE_STAR: 0 };
  for (const p of hsTfPlayers) { htStars[p.ProspectStarRating]++; }
  console.log(`  5★=${htStars.FIVE_STAR} 4★=${htStars.FOUR_STAR} 3★=${htStars.THREE_STAR} 2★=${htStars.TWO_STAR} 1★=${htStars.ONE_STAR}`);

  break;
}

// Also check what the game's "Top Classes" actually counts for Tennessee (22 in-game)
for (const r of teamTable.records) {
  if (r.isEmpty || r.DisplayName !== 'Tennessee') continue;

  const cpRef = parseRef(r.CommittedPlayers);
  if (!cpRef) continue;
  const cpTable = await getTable(cpRef.tableId);
  const cpRec = cpTable.records[cpRef.row];

  const byClass = {};
  for (const f of Object.keys(cpRec.fields)) {
    try {
      const val = cpRec[f];
      const ref = parseRef(val);
      if (!ref) continue;
      const prec = pt.records[ref.row];
      if (!prec || prec.isEmpty) continue;
      const recruit = playerToRecruit.get(ref.row);
      const cls = recruit?.Class ?? 'NO_RECRUIT';
      byClass[cls] = (byClass[cls] || 0) + 1;
    } catch {}
  }

  console.log('\nTennessee by class:');
  for (const [cls, count] of Object.entries(byClass)) {
    console.log(`  ${cls}: ${count}`);
  }
  break;
}

// Check Utah (in-game: 19 total, 0/7/5/7/0)
for (const r of teamTable.records) {
  if (r.isEmpty || r.DisplayName !== 'Utah') continue;

  const cpRef = parseRef(r.CommittedPlayers);
  if (!cpRef) continue;
  const cpTable = await getTable(cpRef.tableId);
  const cpRec = cpTable.records[cpRef.row];

  const byClass = {};
  for (const f of Object.keys(cpRec.fields)) {
    try {
      const val = cpRec[f];
      const ref = parseRef(val);
      if (!ref) continue;
      const prec = pt.records[ref.row];
      if (!prec || prec.isEmpty) continue;
      const recruit = playerToRecruit.get(ref.row);
      const cls = recruit?.Class ?? 'NO_RECRUIT';
      byClass[cls] = (byClass[cls] || 0) + 1;
    } catch {}
  }

  console.log('\nUtah by class:');
  for (const [cls, count] of Object.entries(byClass)) {
    console.log(`  ${cls}: ${count}`);
  }
  break;
}

process.exit(0);
