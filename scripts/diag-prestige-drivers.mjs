import Franchise from 'madden-franchise';
import { parseRef, tableByName } from '../lib/franchiseRefs.ts';

const savePath = 'C:\\Users\\User\\Documents\\EA SPORTS College Football 27\\saves\\DYNASTY-LIBERTY-AUTOSAVE';
const franchise = await Franchise.create(savePath, { autoParse: true });

const teamTable = tableByName(franchise, 'Team');
await teamTable.readRecords();
await teamTable.readRecords();

const teamFields = teamTable.offsetTable.map(o => o.name);
await teamTable.readRecords(teamFields);

const rows = [];
for (const r of teamTable.records) {
  if (r.isEmpty) continue;
  if (r.PrestigeRank === 255) continue;
  if (!r.DisplayName) continue;

  // Follow TeamHistoricalData ref to pull historic wins/losses
  const ref = parseRef(r.TeamHistoricalData);
  let hist = null;
  if (ref) {
    const target = franchise.tables.find(t => t.header?.tableId === ref.tableId);
    if (target) {
      await target.readRecords();
      const fields = target.offsetTable.map(o => o.name);
      await target.readRecords(fields);
      const hrec = target.records[ref.row];
      if (hrec && !hrec.isEmpty) {
        hist = {
          wins: hrec.Wins, losses: hrec.Losses,
          bowlsWon: hrec.BowlsWon, bowlsMade: hrec.BowlsMade,
          natlChampsWon: hrec.NationalChampionshipsWon,
          confChampsWon: hrec.ConferenceChampionshipsWon,
          top10Classes: hrec.Top10RecruitingClasses,
          pollWeeks: hrec.WeeksRankedTop25InMediaPoll,
        };
      }
    }
  }

  rows.push({
    name: r.DisplayName,
    prestige: r.TeamPrestige,
    rank: r.PrestigeRank,
    teamRank: r.TeamRank,
    bias: r.TeamPrestigeBias,
    winPct: r.SeasonWinPct,
    confW: r.ConfWin, confL: r.ConfLoss,
    ncW: r.NonConfWin, ncL: r.NonConfLoss,
    playoffLast: r.LastSeasonPlayoffRoundReached,
    playoffCurr: r.PlayoffRoundReached,
    topClassRank: r.TopClassRank,
    hist,
  });
}

// Distribution
const dist = new Map();
for (const r of rows) dist.set(r.prestige, (dist.get(r.prestige) ?? 0) + 1);
console.log(`=== Prestige distribution (${rows.length} FBS teams) ===`);
for (const [v, c] of [...dist].sort((a, b) => b[0] - a[0])) console.log(`  ${v}: ${c} teams`);

// If still flat, exit early
const uniq = new Set(rows.map(r => r.prestige));
if (uniq.size === 1) {
  console.log(`\nAll teams still at prestige ${[...uniq][0]} — nothing has shifted.`);
  process.exit(0);
}

// Sort by prestige and show top / bottom with driver candidates
rows.sort((a, b) => a.rank - b.rank);
console.log('\n=== Top 15 by prestige ===');
console.log('Rank Prestige Team              W-L    ConfW-L  WinPct PlayoffLast PlayoffNow  TopClassRank HistWins HistBowlsW HistNCW');
for (const r of rows.slice(0, 15)) {
  const wl = `${(r.confW ?? 0) + (r.ncW ?? 0)}-${(r.confL ?? 0) + (r.ncL ?? 0)}`;
  const cwl = `${r.confW ?? 0}-${r.confL ?? 0}`;
  console.log(`  ${String(r.rank).padStart(3)}    ${r.prestige}   ${r.name.padEnd(18)}${wl.padEnd(7)}${cwl.padEnd(9)}${String(r.winPct).padEnd(7)}${String(r.playoffLast).padEnd(12)}${String(r.playoffCurr).padEnd(12)}${String(r.topClassRank).padEnd(13)}${String(r.hist?.wins ?? 0).padEnd(9)}${String(r.hist?.bowlsWon ?? 0).padEnd(11)}${r.hist?.natlChampsWon ?? 0}`);
}

console.log('\n=== Bottom 10 by prestige ===');
for (const r of rows.slice(-10)) {
  const wl = `${(r.confW ?? 0) + (r.ncW ?? 0)}-${(r.confL ?? 0) + (r.ncL ?? 0)}`;
  const cwl = `${r.confW ?? 0}-${r.confL ?? 0}`;
  console.log(`  ${String(r.rank).padStart(3)}    ${r.prestige}   ${r.name.padEnd(18)}${wl.padEnd(7)}${cwl.padEnd(9)}${String(r.winPct).padEnd(7)}${String(r.playoffLast).padEnd(12)}${String(r.playoffCurr).padEnd(12)}${String(r.topClassRank).padEnd(13)}${String(r.hist?.wins ?? 0).padEnd(9)}${String(r.hist?.bowlsWon ?? 0).padEnd(11)}${r.hist?.natlChampsWon ?? 0}`);
}
