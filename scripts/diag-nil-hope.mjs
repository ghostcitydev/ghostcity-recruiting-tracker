import Franchise from 'madden-franchise';
import { parseRef } from '../lib/franchiseRefs.ts';

const savePath = 'C:\\Users\\User\\Documents\\EA SPORTS College Football 27\\saves\\DYNASTY-SJSUTEST-AUTOSAVE';
const franchise = await Franchise.create(savePath, { autoParse: true });

const playerTable = franchise.tables.find(t => t.name === 'Player');
const recruitTable = franchise.tables.find(t => t.name === 'Recruit');

await playerTable.readRecords();
await recruitTable.readRecords();

const playerFields = playerTable.offsetTable.map(o => o.name);
const recruitFields = recruitTable.offsetTable.map(o => o.name);
await playerTable.readRecords(playerFields);
await recruitTable.readRecords(recruitFields);

// Find Deron Hope
let found = null;
for (const p of playerTable.records) {
  if (p.isEmpty) continue;
  const first = (p.FirstName ?? '').toString();
  const last = (p.LastName ?? '').toString();
  if (first === 'Deron' && last === 'Hope') {
    found = { row: p.index, player: p };
    break;
  }
}

if (!found) {
  // Fuzzy
  for (const p of playerTable.records) {
    if (p.isEmpty) continue;
    const last = (p.LastName ?? '').toString();
    if (last === 'Hope') {
      console.log(`Found Hope: ${p.FirstName} ${p.LastName} row=${p.index}`);
    }
  }
  process.exit(1);
}

console.log(`=== Deron Hope (Player row ${found.row}) ===`);
console.log(`Fields with numeric value 280-300:`);
for (const f of playerFields) {
  const v = found.player[f];
  if (typeof v === 'number' && v >= 250 && v <= 320) {
    console.log(`  ${f} = ${v}`);
  }
}

console.log(`\nAll numeric fields between 100-500:`);
for (const f of playerFields) {
  const v = found.player[f];
  if (typeof v === 'number' && v >= 100 && v <= 500 && !f.toLowerCase().includes('rating')) {
    console.log(`  ${f} = ${v}`);
  }
}

// Find matching Recruit record
for (const r of recruitTable.records) {
  if (r.isEmpty) continue;
  const ref = parseRef(r.Player);
  if (!ref || ref.row !== found.row) continue;
  console.log(`\n=== Recruit record for Hope (idx ${r.index}) ===`);
  console.log(`Stage=${r.RecruitStage}, Rank=${r.NationalRank}, Class=${r.Class}`);
  console.log(`\nRecruit fields with values 250-320:`);
  for (const f of recruitFields) {
    const v = r[f];
    if (typeof v === 'number' && v >= 250 && v <= 320) {
      console.log(`  ${f} = ${v}`);
    }
  }
  console.log(`\nAll Recruit numeric fields 100-500:`);
  for (const f of recruitFields) {
    const v = r[f];
    if (typeof v === 'number' && v >= 100 && v <= 500) {
      console.log(`  ${f} = ${v}`);
    }
  }
  break;
}
