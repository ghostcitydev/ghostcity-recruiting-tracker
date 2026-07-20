import Franchise from 'madden-franchise';

const savePath = 'C:\\Users\\User\\Documents\\EA SPORTS College Football 27\\saves\\DYNASTY-SJSUTEST-AUTOSAVE';
const franchise = await Franchise.create(savePath, { autoParse: true });

// Check RecruitingBoard
const rbTables = franchise.tables.filter(t => t.name === 'RecruitingBoard');
console.log('RecruitingBoard tables:', rbTables.length);
if (rbTables.length > 0) {
  const rb = rbTables[0];
  await rb.readRecords();
  const nonEmpty = rb.records.filter(r => !r.isEmpty);
  console.log('Non-empty RecruitingBoard records:', nonEmpty.length);
  if (nonEmpty.length > 0) {
    const first = nonEmpty[0];
    console.log('Fields:', Object.keys(first.fields));
    for (const f of Object.keys(first.fields)) {
      try { console.log(`  ${f}:`, first[f]); } catch (e) { console.log(`  ${f}: [error]`); }
    }
  }
}

// Check RecruitTarget
const rtTables = franchise.tables.filter(t => t.name === 'RecruitTarget');
console.log('\nRecruitTarget tables:', rtTables.length);
if (rtTables.length > 0) {
  const rt = rtTables[0];
  await rt.readRecords();
  const nonEmpty = rt.records.filter(r => !r.isEmpty);
  console.log('Non-empty RecruitTarget records:', nonEmpty.length);
  if (nonEmpty.length > 0) {
    const first = nonEmpty[0];
    console.log('Fields:', Object.keys(first.fields));
    for (const f of Object.keys(first.fields)) {
      try { console.log(`  ${f}:`, first[f]); } catch (e) { console.log(`  ${f}: [error]`); }
    }
  }
}

// Check Player table for YearsPro or ContractYear fields
const pt = franchise.tables.find(t => t.name === 'Player');
await pt.readRecords();
const firstPlayer = pt.records.find(r => !r.isEmpty);
if (firstPlayer) {
  const fields = Object.keys(firstPlayer.fields);
  const relevant = fields.filter(f => /year|contract|class|age|redshirt|freshman|recruit|roster|draft/i.test(f));
  console.log('\nPlayer fields matching year/contract/class/age/roster:', relevant);

  // Read the specific interesting ones
  await pt.readRecords(['TeamIndex', 'ProspectStarRating', ...relevant.slice(0, 10)]);

  // Find players with star ratings on teams and check their year-related fields
  const onTeam = [];
  for (const r of pt.records) {
    if (r.isEmpty) continue;
    try {
      const star = r.ProspectStarRating;
      if (!star || star === 'Invalid') continue;
      const ti = r.TeamIndex;
      if (ti !== 255 && ti != null) {
        const info = { TeamIndex: ti, Star: star };
        for (const f of relevant.slice(0, 10)) {
          try { info[f] = r[f]; } catch {}
        }
        onTeam.push(info);
      }
    } catch {}
  }

  console.log('\nSample signed players with year fields (first 10):');
  console.table(onTeam.slice(0, 10));

  // Check YearsPro distribution for star-rated players on teams
  if (relevant.includes('YearsPro')) {
    const yearDist = {};
    for (const p of onTeam) {
      const y = p.YearsPro ?? 'null';
      yearDist[y] = (yearDist[y] || 0) + 1;
    }
    console.log('\nYearsPro distribution for star-rated players on teams:', yearDist);
  }
}

process.exit(0);
