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

let found = null;
for (const p of playerTable.records) {
  if (p.isEmpty) continue;
  if ((p.LastName ?? '') === 'Miles' && (p.FirstName ?? '') === 'Ian') {
    found = p;
    break;
  }
}
if (!found) {
  for (const p of playerTable.records) {
    if (p.isEmpty) continue;
    if ((p.LastName ?? '') === 'Miles') console.log(`  ${p.FirstName} ${p.LastName} row=${p.index}`);
  }
  process.exit(1);
}

console.log(`=== Ian Miles (Player row ${found.index}) — UI shows NIL=220 ===\n`);
console.log('ALL non-zero/non-string numeric fields on Player:');
for (const f of playerFields) {
  const v = found[f];
  if (typeof v === 'number' && v !== 0 && v !== 255) {
    console.log(`  ${f} = ${v}`);
  }
}

for (const r of recruitTable.records) {
  if (r.isEmpty) continue;
  const ref = parseRef(r.Player);
  if (!ref || ref.row !== found.index) continue;
  console.log(`\n=== Recruit row ${r.index}, stage=${r.RecruitStage} ===`);
  console.log('ALL non-zero numeric fields on Recruit:');
  for (const f of recruitFields) {
    const v = r[f];
    if (typeof v === 'number' && v !== 0 && v !== 255) {
      console.log(`  ${f} = ${v}`);
    }
  }
  break;
}

// Also list ALL tables containing "NIL", "Deal", "Recruit", "Comp" in name
console.log('\n=== Related tables ===');
for (const t of franchise.tables) {
  if (/nil|deal|comp/i.test(t.name)) {
    console.log(`  ${t.name} (${t.header?.recordCapacity ?? '?'} records)`);
  }
}
