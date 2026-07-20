import Franchise from 'madden-franchise';

const savePath = process.argv[2] || 'C:\\Users\\User\\Documents\\EA SPORTS College Football 27\\saves\\DYNASTY-SJSUTEST-AUTOSAVE';

console.log('Opening:', savePath);
const franchise = await Franchise.create(savePath, { autoParse: true });
console.log('Game type:', franchise.gameType);

// List all table names to find the recruit table
const tableNames = franchise.tables.map(t => t.name).filter(n => /recruit|player|prospect/i.test(n));
console.log('\nTables matching recruit/player/prospect:', tableNames);

// Try Recruit table
const recruitTables = franchise.tables.filter(t => t.name === 'Recruit');
console.log('\nRecruit tables found:', recruitTables.length);

if (recruitTables.length > 0) {
  const rt = recruitTables[0];
  console.log('Recruit table ID:', rt.header?.tableId);
  console.log('Recruit record count:', rt.header?.recordCount);

  await rt.readRecords();
  const nonEmpty = rt.records.filter(r => !r.isEmpty);
  console.log('Non-empty recruit records:', nonEmpty.length);

  if (nonEmpty.length > 0) {
    const first = nonEmpty[0];
    console.log('\nFirst recruit fields:', Object.keys(first.fields));
    console.log('First recruit data:');
    for (const f of Object.keys(first.fields)) {
      try { console.log(`  ${f}:`, first[f]); } catch (e) { console.log(`  ${f}: [error] ${e.message}`); }
    }
  }
}

// Check Player table for ProspectStarRating
const playerTables = franchise.tables.filter(t => t.name === 'Player');
console.log('\n\nPlayer tables found:', playerTables.length);

if (playerTables.length > 0) {
  const pt = playerTables[0];
  console.log('Player table ID:', pt.header?.tableId);
  console.log('Player record count:', pt.header?.recordCount);

  try {
    await pt.readRecords(['TeamIndex', 'ProspectStarRating']);
    const withStars = pt.records.filter(r => {
      if (r.isEmpty) return false;
      try { return r.ProspectStarRating && r.ProspectStarRating !== 'None'; } catch { return false; }
    });
    console.log('Players with ProspectStarRating (non-None):', withStars.length);

    if (withStars.length > 0) {
      const sample = withStars.slice(0, 5);
      for (const p of sample) {
        try {
          console.log(`  TeamIndex=${p.TeamIndex}, ProspectStarRating=${p.ProspectStarRating}`);
        } catch (e) { console.log('  [error reading]', e.message); }
      }
    }

    const starCounts = {};
    for (const r of pt.records) {
      if (r.isEmpty) continue;
      try {
        const star = r.ProspectStarRating;
        if (star) starCounts[star] = (starCounts[star] || 0) + 1;
      } catch {}
    }
    console.log('\nProspectStarRating distribution:', starCounts);
  } catch (e) {
    console.log('Error reading Player fields:', e.message);
    await pt.readRecords();
    const first = pt.records.find(r => !r.isEmpty);
    if (first) {
      const fieldNames = Object.keys(first.fields);
      const prospectFields = fieldNames.filter(f => /prospect|star|recruit|rating/i.test(f));
      console.log('Prospect-related fields on Player:', prospectFields);
    }
  }
}

// Check how Recruit -> Player reference works
if (recruitTables.length > 0) {
  const rt = recruitTables[0];
  await rt.readRecords();
  const nonEmpty = rt.records.filter(r => !r.isEmpty);
  console.log('\n\n--- Checking Recruit -> Player references ---');

  for (const rec of nonEmpty.slice(0, 3)) {
    const playerVal = rec.Player;
    console.log('Raw Player field value:', playerVal, typeof playerVal);

    // Try parsing as ref
    const str = String(playerVal);
    const match = str.match(/^([01]{32})$/);
    if (match) {
      const bits = match[1];
      const tableId = parseInt(bits.substring(0, 15), 2);
      const row = parseInt(bits.substring(15), 2);
      console.log(`  -> tableId=${tableId}, row=${row}`);
    } else {
      console.log('  -> Not a 32-char binary ref. Trying as object...');
      if (playerVal && typeof playerVal === 'object') {
        console.log('  Keys:', Object.keys(playerVal));
      }
    }
  }
}

process.exit(0);
