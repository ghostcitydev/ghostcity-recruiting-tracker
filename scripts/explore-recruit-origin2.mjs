import Franchise from 'madden-franchise';
import { parseRef, tableByName } from '../lib/franchiseRefs.ts';

const savePath = 'C:\\Users\\User\\Documents\\EA SPORTS College Football 27\\saves\\DYNASTY-SJSUTEST-AUTOSAVE';
const franchise = await Franchise.create(savePath, { autoParse: true });

const recruitTable = tableByName(franchise, 'Recruit');
await recruitTable.readRecords();

const playerTable = franchise.tables.find(t => t.name === 'Player');
await playerTable.readRecords();

// Show all distinct RecruitStage and Class values
const stages = new Set(), classes = new Set();
for (const r of recruitTable.records) {
  if (!r.isEmpty) { stages.add(r.RecruitStage); classes.add(r.Class); }
}
console.log('Stages:', [...stages].join(', '));
console.log('Classes:', [...classes].join(', '));

// Find any committed/signed/offered HS recruit
const hs = recruitTable.records.find(r =>
  !r.isEmpty && r.Class !== 'Transfer' && r.Class !== 'FreeAgent'
);
if (hs) {
  console.log('\nSample HS recruit fields:', Object.keys(hs.fields).join(', '));
  for (const f of Object.keys(hs.fields)) {
    try { const v = hs[f]; if (v != null && v !== '') console.log(`  ${f} = ${v}`); } catch {}
  }

  // Check their Player record
  const ref = parseRef(hs.Player);
  if (ref) {
    const p = playerTable.records[ref.row];
    if (p && !p.isEmpty) {
      const fields = Object.keys(p.fields);
      console.log('\nPlayer fields count:', fields.length);
      const locFields = fields.filter(f => /home|state|city|region|pipeline|location|origin|birth|address/i.test(f));
      console.log('Location-like fields:', locFields.join(', '));
      for (const f of locFields) {
        try { console.log(`  ${f} = ${p[f]}`); } catch {}
      }
      // Also try pipeline field directly
      const pipelineFields = fields.filter(f => /pipeline/i.test(f));
      console.log('Pipeline fields:', pipelineFields.join(', '));
      for (const f of pipelineFields) {
        try { console.log(`  ${f} = ${p[f]}`); } catch {}
      }
      // Print all non-empty fields
      console.log('\nAll non-empty player fields:');
      for (const f of fields) {
        try { const v = p[f]; if (v != null && v !== '' && v !== 0) console.log(`  ${f} = ${v}`); } catch {}
      }
    }
  }
}

// Check the Recruit summary entries for pipeline info
const recruitSummaries = franchise.tables.filter(t => t.name === 'RecruitSummaryEntry');
if (recruitSummaries.length) {
  const rs = recruitSummaries[0];
  await rs.readRecords();
  const first = rs.records.find(r => !r.isEmpty);
  if (first) {
    console.log('\n=== RecruitSummaryEntry fields ===');
    console.log(Object.keys(first.fields).join(', '));
    for (const f of Object.keys(first.fields)) {
      try { const v = first[f]; if (v != null && v !== '') console.log(`  ${f} = ${v}`); } catch {}
    }
  }
}
