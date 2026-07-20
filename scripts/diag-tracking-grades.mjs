import Franchise from 'madden-franchise';
import { parseRef } from '../lib/franchiseRefs.ts';

const savePath = 'C:\\Users\\User\\Documents\\EA SPORTS College Football 27\\saves\\DYNASTY-SJSUTEST-AUTOSAVE';
const franchise = await Franchise.create(savePath, { autoParse: true });

// Read tracking table up front
const trackingTable = franchise.tables.find(t => t.name === 'MySchoolTrackingTable');
await trackingTable.readRecords();

// Read Team table - find all fields and look for tracking ref
const { tableByName } = await import('../lib/franchiseRefs.ts');
const teamTable = tableByName(franchise, 'Team');
await teamTable.readRecords(['DisplayName', 'ShortName', 'NickName', 'TeamIndex',
  'MySchoolTrackingTable', 'SchoolTrackingTable', 'FanHappinessTrackingTable',
  'ProgramPointsStadiumAtmosphereGrade']);

// Find OSU record
const osu = teamTable.records.find(r => !r.isEmpty && r.TeamIndex != null && r.TeamIndex !== 255 &&
  (String(r.DisplayName ?? '') + String(r.NickName ?? '')).match(/ohio|buckeye/i));

if (osu) {
  console.log('=== OSU Team record ===');
  console.log('TeamIndex:', osu.TeamIndex, 'DisplayName:', osu.DisplayName);
  console.log('ProgramPointsAtmosphereGrade:', osu.ProgramPointsStadiumAtmosphereGrade);

  // Check all fields for binary refs that might point to tracking table
  for (const f of Object.keys(osu.fields)) {
    try {
      const v = osu[f];
      if (typeof v === 'string' && v.length === 32 && /[01]+/.test(v)) {
        const ref = parseRef(v);
        if (ref) console.log(`  ref field: ${f} → tableId=${ref.tableId}, row=${ref.row}`);
      }
    } catch {}
  }
} else {
  // Show all teams with TeamIndex
  let shown = 0;
  for (const r of teamTable.records) {
    if (!r.isEmpty && r.TeamIndex != null && r.TeamIndex !== 255 && shown < 20) {
      console.log(`TeamIndex=${r.TeamIndex} Display=${r.DisplayName} Short=${r.ShortName}`);
      shown++;
    }
  }
}

// Also check first 3 non-empty Team records for any ref fields
console.log('\n=== First 3 Team records - all ref fields ===');
let shown2 = 0;
for (const r of teamTable.records) {
  if (!r.isEmpty && r.TeamIndex != null && r.TeamIndex !== 255 && shown2 < 3) {
    console.log(`TeamIndex=${r.TeamIndex} (${r.DisplayName}):`);
    for (const f of Object.keys(r.fields)) {
      try {
        const v = r[f];
        if (typeof v === 'string' && v.length === 32) {
          const ref = parseRef(v);
          if (ref) console.log(`  ${f} → tableId=${ref.tableId}, row=${ref.row}`);
        }
      } catch {}
    }
    shown2++;
  }
}

// What is the tracking table's tableId?
console.log('\nTracking table header:', JSON.stringify(trackingTable.header));
