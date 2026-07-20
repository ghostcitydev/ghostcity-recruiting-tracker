import Franchise from 'madden-franchise';

const savePath = 'C:\\Users\\User\\Documents\\EA SPORTS College Football 27\\saves\\DYNASTY-SJSUTEST-AUTOSAVE';
const franchise = await Franchise.create(savePath, { autoParse: true });

// Get team table header to find all field names
const teamTable = franchise.tables.find(t => t.name === 'Team');

// Read just the header/schema
const header = teamTable.header;
console.log('Team table field count:', header?.numMembers);

// Try reading all fields by not specifying field list
// madden-franchise reads all fields by default
await teamTable.readRecords();

// Find a record that has fields
for (const r of teamTable.records) {
  if (r.isEmpty) continue;
  // Try to get field info from the table schema
  const fieldNames = [];
  for (const field of teamTable.header.fields) {
    fieldNames.push(field.name);
  }
  console.log('Total fields:', fieldNames.length);

  // Print all field names
  const recruitRelated = fieldNames.filter(f =>
    /recruit|class|commit|sign|prospect|scholar|star|roster/i.test(f)
  );
  console.log('\nRecruit/class related fields:', recruitRelated);

  // Try reading specific fields
  for (const f of recruitRelated) {
    try {
      console.log(`  ${f}: ${r[f]}`);
    } catch (e) {
      console.log(`  ${f}: [error] ${e.message?.slice(0, 50)}`);
    }
  }

  // Look for any field with "Count" or "Total" or "Signed"
  const countFields = fieldNames.filter(f =>
    /count|total|signed|five|four|three|two|one/i.test(f)
  );
  console.log('\nCount/total fields:', countFields);

  break;
}

process.exit(0);
