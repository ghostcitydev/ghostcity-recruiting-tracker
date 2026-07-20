import Franchise from 'madden-franchise';
import { parseRef } from '../lib/franchiseRefs.ts';

const savePath = 'C:\\Users\\User\\Documents\\EA SPORTS College Football 27\\saves\\DYNASTY-SJSUTEST-AUTOSAVE';
const franchise = await Franchise.create(savePath, { autoParse: true });

const teamTable = franchise.tables.find(t => t.name === 'Team');
await teamTable.readRecords();
let first;
for (const r of teamTable.records) {
  if (r.isEmpty) continue;
  try { if (r.DisplayName) { first = r; break; } } catch { continue; }
}
if (!first) { console.log('No team found'); process.exit(1); }
const fields = Object.keys(first.fields);
const recruitFields = fields.filter(f => /recruit|board|class|commit|sign|prospect/i.test(f));
console.log('Team recruit-related fields:', recruitFields);
console.log('All Team fields:', fields.join(', '));

// Check if Team has a RecruitingBoard reference
for (const f of fields) {
  try {
    const val = first[f];
    const ref = parseRef(val);
    if (ref) {
      const refTable = franchise.getTableById(ref.tableId);
      if (refTable.name === 'RecruitingBoard') {
        console.log(`\nFound RecruitingBoard ref in Team.${f}!`);
        console.log(`  Team: ${first.DisplayName}, Board tableId=${ref.tableId}, row=${ref.row}`);
      }
    }
  } catch {}
}

// Alternative: check RecruitSummaryEntry table
const summaryTables = franchise.tables.filter(t => t.name === 'RecruitSummaryEntry');
console.log('\nRecruitSummaryEntry tables:', summaryTables.length);
if (summaryTables.length > 0) {
  const st = summaryTables[0];
  await st.readRecords();
  const nonEmpty = st.records.filter(r => !r.isEmpty);
  console.log('Non-empty entries:', nonEmpty.length);
  if (nonEmpty.length > 0) {
    console.log('Fields:', Object.keys(nonEmpty[0].fields));
    for (const f of Object.keys(nonEmpty[0].fields)) {
      try { console.log(`  ${f}:`, nonEmpty[0][f]); } catch (e) { console.log(`  ${f}: [error]`); }
    }
  }
}

// Check TopClassRank more carefully - this IS on Team
// If a team has TopClassRank, the game knows committed recruits
// Let's look at the Recruit table's TopSchoolsList
const rt = franchise.tables.find(t => t.name === 'Recruit');
await rt.readRecords();
const signed = rt.records.filter(r => !r.isEmpty && r.RecruitStage === 'Signed');
console.log('\n--- Checking TopSchoolsList on Signed recruits ---');
for (const rec of signed.slice(0, 5)) {
  const tsl = rec.TopSchoolsList;
  const ref = parseRef(tsl);
  console.log(`TopSchoolsList: ${tsl} -> ref: ${ref ? `tableId=${ref.tableId}, row=${ref.row}` : 'null'}`);
}

// Try to find what TopSchoolsList points to
const firstSigned = signed[0];
const tslRef = parseRef(firstSigned.TopSchoolsList);
if (tslRef) {
  const tslTable = franchise.getTableById(tslRef.tableId);
  await tslTable.readRecords();
  console.log('\nTopSchoolsList table name:', tslTable.name);
  const tslRec = tslTable.records[tslRef.row];
  if (tslRec && !tslRec.isEmpty) {
    console.log('Fields:', Object.keys(tslRec.fields));
    for (const f of Object.keys(tslRec.fields)) {
      try { console.log(`  ${f}:`, tslRec[f]); } catch { console.log(`  ${f}: [error]`); }
    }
  }
}

process.exit(0);
