import Franchise from 'madden-franchise';
import { parseRef, tableByName } from '../lib/franchiseRefs.ts';

const savePath = 'C:\\Users\\User\\Documents\\EA SPORTS College Football 27\\saves\\DYNASTY-NEVADA';
const franchise = await Franchise.create(savePath, { autoParse: true });

const STATIC_FIELDS = ['AcademicPrestigeGrade', 'CampusLifestyleGrade'];
const DERIVED_FIELDS = [
  'AthleticFacilitiesGrade', 'BrandExposureGrade', 'ChampionshipContenderGrade',
  'CoachPrestigeGrade', 'CoachStabilityGrade', 'ConferencePrestigeGrade',
  'ProgramTraditionGrade', 'StadiumAtmosphereGrade',
];

const teamTable = tableByName(franchise, 'Team');
await teamTable.readRecords();
await teamTable.readRecords(['DisplayName', 'PrestigeRank', 'MySchoolTrackingTable']);

const dist = {};
for (const f of [...STATIC_FIELDS, ...DERIVED_FIELDS]) dist[f] = {};

const samples = [];
for (const t of teamTable.records) {
  if (t.isEmpty || t.PrestigeRank === 255) continue;
  const ref = parseRef(t.MySchoolTrackingTable);
  if (!ref) continue;
  const table = franchise.tables.find(tt => tt.header?.tableId === ref.tableId);
  if (!table) continue;
  await table.readRecords();
  await table.readRecords([...STATIC_FIELDS, ...DERIVED_FIELDS]);
  const rec = table.records[ref.row];
  if (!rec || rec.isEmpty) continue;
  for (const f of [...STATIC_FIELDS, ...DERIVED_FIELDS]) {
    const v = rec[f];
    dist[f][v] = (dist[f][v] ?? 0) + 1;
  }
  if (['Ohio State', 'South Carolina', 'Sac State', 'Cincinnati', 'Sam Houston'].includes(t.DisplayName)) {
    samples.push({ name: t.DisplayName, grades: Object.fromEntries([...STATIC_FIELDS, ...DERIVED_FIELDS].map(f => [f, rec[f]])) });
  }
}

console.log('=== Distribution per grade field across FBS teams ===');
for (const f of [...STATIC_FIELDS, ...DERIVED_FIELDS]) {
  const entries = Object.entries(dist[f]).sort((a, b) => b[1] - a[1]);
  console.log(`  ${f}: ${entries.map(([v, c]) => `${v}=${c}`).join(', ')}`);
}

console.log('\n=== Sample teams ===');
for (const s of samples) {
  console.log(`\n${s.name}:`);
  console.log('  STATIC:');
  for (const f of STATIC_FIELDS) console.log(`    ${f} = ${s.grades[f]}`);
  console.log('  DERIVED:');
  for (const f of DERIVED_FIELDS) console.log(`    ${f} = ${s.grades[f]}`);
}
