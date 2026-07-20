import Franchise from 'madden-franchise';
import { tableByName } from '../lib/franchiseRefs.ts';

const savePath = 'C:\\Users\\User\\Documents\\EA SPORTS College Football 27\\saves\\DYNASTY-SACSTATE';
const franchise = await Franchise.create(savePath, { autoParse: true });

const playerTable = tableByName(franchise, 'Player');
await playerTable.readRecords(['OverallRating', 'TeamIndex', 'SpeedRating']);
const rostered = playerTable.records.filter(p => !p.isEmpty && p.TeamIndex !== 255);
const ovrs = rostered.map(p => p.OverallRating).filter(v => typeof v === 'number');
console.log(`Rostered players: ${rostered.length}`);
console.log(`OVR distinct values: ${new Set(ovrs).size}`);
console.log(`Min: ${Math.min(...ovrs)}, Max: ${Math.max(...ovrs)}, Mean: ${(ovrs.reduce((a,b)=>a+b,0)/ovrs.length).toFixed(1)}`);
console.log(`Sample first 10: ${ovrs.slice(0, 10).join(', ')}`);

// Team OVR
const teamTable = tableByName(franchise, 'Team');
await teamTable.readRecords(['DisplayName', 'PrestigeRank', 'TEAM_RATINGOVR']);
const teamOvrs = [];
for (const r of teamTable.records) {
  if (r.isEmpty || r.PrestigeRank === 255 || !r.DisplayName) continue;
  teamOvrs.push({ name: r.DisplayName, ovr: r.TEAM_RATINGOVR });
}
teamOvrs.sort((a, b) => b.ovr - a.ovr);
console.log(`\nTeam OVRs — top 5: ${teamOvrs.slice(0, 5).map(t => `${t.name}=${t.ovr}`).join(', ')}`);
console.log(`Team OVRs — bottom 5: ${teamOvrs.slice(-5).map(t => `${t.name}=${t.ovr}`).join(', ')}`);
