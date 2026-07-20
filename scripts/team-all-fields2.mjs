import Franchise from 'madden-franchise';

const savePath = 'C:\\Users\\User\\Documents\\EA SPORTS College Football 27\\saves\\DYNASTY-SJSUTEST-AUTOSAVE';
const franchise = await Franchise.create(savePath, { autoParse: true });

const teamTable = franchise.tables.find(t => t.name === 'Team');
console.log('Team table has', teamTable.header?.numMembers, 'fields');

await teamTable.readRecords();

// Get field names from the first non-empty record
for (const r of teamTable.records) {
  if (r.isEmpty) continue;
  const fieldNames = Object.keys(r.fields);
  console.log('Actual readable fields:', fieldNames.length);

  const recruitRelated = fieldNames.filter(f =>
    /recruit|class|commit|sign|prospect|scholar|star|five|four|three|two|roster/i.test(f)
  );
  console.log('\nRecruit/star related:', recruitRelated);
  for (const f of recruitRelated) {
    try { console.log(`  ${f}: ${r[f]}`); } catch {}
  }

  // Also check for "Last" fields (LastSeason...)
  const lastFields = fieldNames.filter(f => /last/i.test(f));
  console.log('\n"Last" fields:', lastFields);
  for (const f of lastFields) {
    try { console.log(`  ${f}: ${r[f]}`); } catch {}
  }

  // Check TopClassRank and any ranking fields
  const rankFields = fieldNames.filter(f => /rank|rating|overall|prestige|points/i.test(f));
  console.log('\nRank/rating fields:', rankFields);

  break;
}

process.exit(0);
