import Franchise from 'madden-franchise';

const savePath = 'C:\\Users\\User\\Documents\\EA SPORTS College Football 27\\saves\\DYNASTY-SJSUTEST-AUTOSAVE';
const franchise = await Franchise.create(savePath, { autoParse: true });

// List all tables to find pipeline/coach/grade related ones
const allTables = franchise.tables.map(t => t.name).sort();
console.log('=== ALL TABLE NAMES ===');
for (const n of allTables) {
  if (/pipeline|coach|recruit|school|prospect|program|grade|academic|tracking/i.test(n)) {
    console.log(' *', n);
  }
}

console.log('\n=== PIPELINE TABLE ===');
const pipelines = franchise.tables.filter(t => /pipeline/i.test(t.name));
for (const pt of pipelines) {
  await pt.readRecords();
  const firstNonEmpty = pt.records.find(r => !r.isEmpty);
  if (firstNonEmpty) {
    console.log('Table:', pt.name, '| rows:', pt.records.length);
    console.log('Fields:', Object.keys(firstNonEmpty.fields).join(', '));
    console.log('Sample:', Object.fromEntries(Object.keys(firstNonEmpty.fields).slice(0, 10).map(k => [k, firstNonEmpty[k]])));
  }
}

console.log('\n=== COACH TABLES ===');
const coachTables = franchise.tables.filter(t => /^coach/i.test(t.name));
for (const ct of coachTables) {
  await ct.readRecords();
  const firstNonEmpty = ct.records.find(r => !r.isEmpty);
  if (firstNonEmpty) {
    console.log('Table:', ct.name, '| rows:', ct.records.length);
    console.log('Fields:', Object.keys(firstNonEmpty.fields).join(', '));
  }
}

console.log('\n=== TEAM FIELDS (for missing grades) ===');
const teamTable = franchise.tables.find(t => t.name === 'Team');
await teamTable.readRecords();
const firstTeam = teamTable.records.find(r => !r.isEmpty && r.DisplayName === 'Alabama');
if (firstTeam) {
  const fields = Object.keys(firstTeam.fields);
  const gradeFields = fields.filter(f => /grade|academic|playingtime|coach/i.test(f));
  console.log('Grade/coach fields on Team:', gradeFields.join(', '));
  for (const f of gradeFields) {
    try { console.log(' ', f, '=', firstTeam[f]); } catch {}
  }
}

console.log('\n=== MYSCHOOL TRACKING TABLE ===');
const tracking = franchise.tables.filter(t => t.name === 'MySchoolTrackingTable');
for (const tt of tracking) {
  await tt.readRecords();
  const firstNonEmpty = tt.records.find(r => !r.isEmpty);
  if (firstNonEmpty) {
    console.log('Fields:', Object.keys(firstNonEmpty.fields).join(', '));
    const gradeFields = Object.keys(firstNonEmpty.fields).filter(f => /grade|score|pipeline|academic|coach/i.test(f));
    console.log('Grade/score/pipeline fields:', gradeFields);
    for (const f of gradeFields.slice(0, 20)) {
      try { console.log(' ', f, '=', firstNonEmpty[f]); } catch {}
    }
  }
}
