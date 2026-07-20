import Franchise from 'madden-franchise';
import { parseRef, tableByName } from '../lib/franchiseRefs.ts';

const savePath = 'C:\\Users\\User\\Documents\\EA SPORTS College Football 27\\saves\\DYNASTY-SJSUTEST-AUTOSAVE';
const franchise = await Franchise.create(savePath, { autoParse: true });

// Check all fields on a signed HS recruit's Player record
const recruitTable = tableByName(franchise, 'Recruit');
await recruitTable.readRecords(['Player', 'Class', 'RecruitStage', 'SchoolIndex']);

const playerTable = franchise.tables.find(t => t.name === 'Player');
await playerTable.readRecords();

// Find a few signed HS recruits
const signed = recruitTable.records.filter(r =>
  !r.isEmpty && r.RecruitStage === 'Signed' && r.Class !== 'Transfer'
).slice(0, 5);

console.log('=== SIGNED HS RECRUIT PLAYER FIELDS ===');
for (const rec of signed) {
  const ref = parseRef(rec.Player);
  if (!ref) continue;
  const p = playerTable.records[ref.row];
  if (!p || p.isEmpty) continue;
  const fields = Object.keys(p.fields);
  console.log('\nAll fields:', fields.join(', '));

  // Focus on location/pipeline related fields
  const locFields = fields.filter(f => /home|state|city|region|pipeline|location|origin/i.test(f));
  console.log('Location fields:', locFields.join(', '));
  for (const f of locFields) {
    try { console.log(`  ${f} = ${p[f]}`); } catch {}
  }

  // Also show star and name
  try { console.log(`  Name: ${p.FirstName} ${p.LastName}, Star: ${p.ProspectStarRating}, Pos: ${p.Position}`); } catch {}
  break; // just show one full list
}

// Now check SchoolIndex on Recruit - this might be the school they committed to
console.log('\n=== RECRUIT TABLE FIELDS ===');
const firstSigned = signed[0];
if (firstSigned) {
  console.log('Recruit fields:', Object.keys(firstSigned.fields).join(', '));
  for (const f of Object.keys(firstSigned.fields)) {
    try { console.log(`  ${f} = ${firstSigned[f]}`); } catch {}
  }
}

// Check ProspectTargetSchool
const prospectTargetTables = franchise.tables.filter(t => t.name === 'ProspectTargetSchool');
if (prospectTargetTables.length) {
  console.log('\n=== ProspectTargetSchool FIELDS ===');
  const pt = prospectTargetTables[0];
  await pt.readRecords();
  const first = pt.records.find(r => !r.isEmpty);
  if (first) {
    console.log('Fields:', Object.keys(first.fields).join(', '));
    for (const f of Object.keys(first.fields)) {
      try { console.log(`  ${f} = ${first[f]}`); } catch {}
    }
  }
}
