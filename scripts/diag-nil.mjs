import Franchise from 'madden-franchise';
import { parseRef } from '../lib/franchiseRefs.ts';

const savePath = 'C:\\Users\\User\\Documents\\EA SPORTS College Football 27\\saves\\DYNASTY-LIBERTY-AUTOSAVE';
const franchise = await Franchise.create(savePath, { autoParse: true });

const recruitTable = franchise.tables.find(t => t.name === 'Recruit');
await recruitTable.readRecords(['Player', 'RecruitStage', 'Class', 'NationalRank']);

const playerTable = franchise.tables.find(t => t.name === 'Player');
await playerTable.readRecords(['BaseNILValue', 'CurrentNILCompensation', 'IsNIL', 'Position']);

// Show NIL demand distribution for active recruits
const vals = [];
let total = 0;
for (const r of recruitTable.records) {
  if (r.isEmpty) continue;
  const ref = parseRef(r.Player);
  if (!ref) continue;
  const p = playerTable.records[ref.row];
  if (!p || p.isEmpty) continue;
  const nil = p.BaseNILValue ?? 0;
  vals.push(nil);
  total++;
}

vals.sort((a, b) => a - b);
console.log(`Total recruits: ${total}`);
console.log(`NIL=0: ${vals.filter(v => v === 0).length}`);
console.log(`NIL>0: ${vals.filter(v => v > 0).length}`);
console.log(`Min: ${vals[0]}, Max: ${vals[vals.length - 1]}`);
console.log(`Sample values: ${vals.slice(0, 20).join(', ')}`);

// Show RecruitStage values and Class values
const stages = new Set(), classes = new Set();
for (const r of recruitTable.records) {
  if (!r.isEmpty) { stages.add(r.RecruitStage); classes.add(r.Class); }
}
console.log('\nRecruitStage values:', [...stages].join(', '));
console.log('Class values:', [...classes].join(', '));

// Show a few non-zero NIL with their stage/class
console.log('\n=== Sample non-zero NIL recruits ===');
let shown = 0;
for (const r of recruitTable.records) {
  if (r.isEmpty || shown >= 5) continue;
  const ref = parseRef(r.Player);
  if (!ref) continue;
  const p = playerTable.records[ref.row];
  if (!p || p.isEmpty || (p.BaseNILValue ?? 0) === 0) continue;
  console.log(`  Stage=${r.RecruitStage}, Class=${r.Class}, Rank=${r.NationalRank}, BaseNIL=${p.BaseNILValue}, CurrentNIL=${p.CurrentNILCompensation}`);
  shown++;
}
