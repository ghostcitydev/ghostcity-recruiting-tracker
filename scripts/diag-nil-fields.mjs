import Franchise from 'madden-franchise';
import { parseRef } from '../lib/franchiseRefs.ts';

const savePath = 'C:\\Users\\User\\Documents\\EA SPORTS College Football 27\\saves\\DYNASTY-SJSUTEST-AUTOSAVE';
const franchise = await Franchise.create(savePath, { autoParse: true });

const playerTable = franchise.tables.find(t => t.name === 'Player');
const recruitTable = franchise.tables.find(t => t.name === 'Recruit');

await playerTable.readRecords();
await recruitTable.readRecords();

// List all Player fields containing NIL/Comp/Money/Expected/Deal
const fields = playerTable.offsetTable.map(o => o.name);
const nilFields = fields.filter(f => /nil|comp|money|expected|deal|demand|pay|dollar/i.test(f));
console.log('Player NIL-ish fields:', nilFields);

const recFields = recruitTable.offsetTable.map(o => o.name);
const recNilFields = recFields.filter(f => /nil|comp|money|expected|deal|demand|pay|dollar/i.test(f));
console.log('\nRecruit NIL-ish fields:', recNilFields);

// Sample first 3 unsigned recruits — show all these fields
await recruitTable.readRecords(['Player', 'RecruitStage', ...recNilFields]);
await playerTable.readRecords(nilFields);

let shown = 0;
for (const r of recruitTable.records) {
  if (r.isEmpty || shown >= 5) continue;
  if (r.RecruitStage !== 'Invalid' && r.RecruitStage !== 'Top10') continue;
  const ref = parseRef(r.Player);
  if (!ref) continue;
  const p = playerTable.records[ref.row];
  if (!p || p.isEmpty) continue;
  console.log(`\n--- Recruit stage=${r.RecruitStage} ---`);
  for (const f of recNilFields) console.log(`  Recruit.${f}=${r[f]}`);
  for (const f of nilFields) console.log(`  Player.${f}=${p[f]}`);
  shown++;
}
