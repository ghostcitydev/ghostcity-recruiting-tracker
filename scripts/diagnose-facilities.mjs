import Franchise from 'madden-franchise';

const savePath = 'C:\\Users\\User\\Documents\\EA SPORTS College Football 27\\saves\\DYNASTY-SJSUTEST-AUTOSAVE';
const franchise = await Franchise.create(savePath, { autoParse: true });

// Find MySchoolTrackingTable
const trackingTables = franchise.tables.filter(t => t.name === 'MySchoolTrackingTable');
console.log('MySchoolTrackingTable count:', trackingTables.length);

if (trackingTables.length === 0) {
  // List all table names to help find it
  const names = [...new Set(franchise.tables.map(t => t.name))].sort();
  console.log('All table names containing "school" or "tracking" or "facilit":');
  names.filter(n => /school|tracking|facilit/i.test(n)).forEach(n => console.log(' ', n));
  process.exit(0);
}

const table = trackingTables[0];
await table.readRecords();

// Check what fields are available
const firstNonEmpty = table.records.find(r => !r.isEmpty);
if (firstNonEmpty) {
  console.log('Fields on first non-empty record:', Object.keys(firstNonEmpty.fields));
}

// Print first 5 non-empty records with row index
let count = 0;
table.records.forEach((r, idx) => {
  if (r.isEmpty || count >= 10) return;
  count++;
  const grade = r.AthleticFacilitiesGrade;
  const score = r.AthleticFacilitiesScore;
  const teamIdx = r.TeamIndex;
  console.log(`row=${idx} TeamIndex=${teamIdx} grade=${grade} score=${score}`);
});
