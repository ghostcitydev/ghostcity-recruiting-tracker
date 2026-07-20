import Franchise from 'madden-franchise';
import { parseRef } from '../lib/franchiseRefs.ts';

const savePath = 'C:\\Users\\User\\Documents\\EA SPORTS College Football 27\\saves\\DYNASTY-SJSUTEST-AUTOSAVE';
const franchise = await Franchise.create(savePath, { autoParse: true });

const teamTable = franchise.tables.find(t => t.name === 'Team');
await teamTable.readRecords(['DisplayName', 'TeamIndex']);

// List ALL field names from the first non-empty record
const first = teamTable.records.find(r => !r.isEmpty);
console.log('Team field names:', Object.keys(first.fields));

// Look for recruit/board refs
const allFields = Object.keys(first.fields);
const recruitRelated = allFields.filter(f => /recruit|board|class|commit|sign|prospect|scholar/i.test(f));
console.log('\nRecruit-related:', recruitRelated);

// Read those fields
if (recruitRelated.length > 0) {
  await teamTable.readRecords([...recruitRelated, 'DisplayName', 'TeamIndex']);
  for (const r of teamTable.records) {
    if (r.isEmpty) continue;
    try {
      if (r.DisplayName !== 'Minnesota') continue;
      console.log('\nMinnesota:');
      for (const f of recruitRelated) {
        try {
          const val = r[f];
          console.log(`  ${f}: ${val}`);
          const ref = parseRef(val);
          if (ref) console.log(`    -> tableId=${ref.tableId}, row=${ref.row}`);
        } catch {}
      }
    } catch {}
  }
}

// Check TopSchoolsList on signed recruits
const rt = franchise.tables.find(t => t.name === 'Recruit');
await rt.readRecords();
const signed = rt.records.filter(r => !r.isEmpty && r.RecruitStage === 'Signed');
console.log('\nChecking TopSchoolsList on first 3 signed recruits:');
for (const rec of signed.slice(0, 3)) {
  const tslVal = rec.TopSchoolsList;
  const ref = parseRef(tslVal);
  if (ref) {
    const tslTable = franchise.getTableById(ref.tableId);
    await tslTable.readRecords();
    const tslRec = tslTable.records[ref.row];
    console.log(`\n  TopSchoolsList table: ${tslTable.name}`);
    console.log('  Fields:', Object.keys(tslRec.fields));
    // Print field values
    for (const f of Object.keys(tslRec.fields).slice(0, 10)) {
      try { console.log(`    ${f}: ${tslRec[f]}`); } catch {}
    }
    break;
  }
}

// Check CommitScore on signed recruits - it might indicate which team
console.log('\n--- CommitScore on signed recruits ---');
const commitScoreDist = {};
for (const rec of signed) {
  const cs = rec.CommitScore ?? 'null';
  commitScoreDist[cs] = (commitScoreDist[cs] || 0) + 1;
}
console.log('CommitScore dist:', commitScoreDist);

process.exit(0);
