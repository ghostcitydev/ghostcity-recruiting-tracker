import Franchise from 'madden-franchise';
import { copyFile, mkdir } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

type PositionGroup = { key: string; label: string; positions: string[]; weights: Record<string, number> };
type Player = { name: string; overall: number; position: string; record: { Position: string } };
type PlayerRecord = { isEmpty: boolean; TeamIndex: number; FirstName?: string; LastName?: string; OverallRating?: number; Position: string };
type PlayerTable = { records: PlayerRecord[]; readRecords(): Promise<void> };

const GROUPS: PositionGroup[] = [
  { key: 'tackle', label: 'Offensive Tackle', positions: ['LT', 'RT'], weights: { LT: 1, RT: 1 } },
  { key: 'guard', label: 'Offensive Guard', positions: ['LG', 'RG'], weights: { LG: 1, RG: 1 } },
  { key: 'dline', label: 'Defensive End', positions: ['LE', 'RE'], weights: { LE: 1, RE: 1 } },
  { key: 'olb', label: 'Outside Linebacker', positions: ['LOLB', 'ROLB'], weights: { LOLB: 1, ROLB: 1 } },
  { key: 'secondary', label: 'Secondary', positions: ['CB', 'FS', 'SS'], weights: { CB: 1.5, FS: 1, SS: 1 } },
];

function weightedTargets(total: number, positions: string[], weights: Record<string, number>) {
  const totalWeight = positions.reduce((sum, position) => sum + (weights[position] ?? 1), 0);
  const targets: Record<string, number> = {};
  const remainders = positions.map((position) => {
    const exact = (total * (weights[position] ?? 1)) / totalWeight;
    targets[position] = Math.floor(exact);
    return { position, remainder: exact - Math.floor(exact) };
  }).sort((a, b) => b.remainder - a.remainder);
  let remaining = total - Object.values(targets).reduce((sum, count) => sum + count, 0);
  for (let index = 0; remaining > 0; index = (index + 1) % remainders.length, remaining--) targets[remainders[index].position]++;
  return targets;
}

function rebalanceGroup(players: Player[], group: PositionGroup) {
  const counts = Object.fromEntries(group.positions.map((position) => [position, players.filter((player) => player.position === position).length]));
  const targets = weightedTargets(players.length, group.positions, group.weights);
  const deficits = Object.fromEntries(group.positions.map((position) => [position, Math.max(0, targets[position] - counts[position])]));
  const candidates = group.positions.flatMap((position) => {
    const surplus = counts[position] - targets[position];
    if (surplus <= 0) return [];
    return players.filter((player) => player.position === position).sort((a, b) => b.overall - a.overall).slice(1, 1 + surplus).map((player) => ({ ...player, from: position }));
  }).sort((a, b) => b.overall - a.overall);
  const moves: { name: string; overall: number; from: string; to: string }[] = [];
  for (const candidate of candidates) {
    const destination = Object.entries(deficits).filter(([, deficit]) => deficit > 0).sort(([, a], [, b]) => b - a)[0]?.[0];
    if (!destination) break;
    candidate.record.Position = destination;
    deficits[destination]--;
    moves.push({ name: candidate.name, overall: candidate.overall, from: candidate.from, to: destination });
  }
  return { moves, unresolved: Object.entries(deficits).filter(([, deficit]) => deficit > 0).map(([position]) => position) };
}

export type RebalanceResult = {
  totalMoves: number; teamsProcessed: number; teamsChanged: number; backupPath: string;
  groups: { key: string; label: string; moves: number; unresolved: string[] }[]; log: string[];
};

export async function rebalanceSaveFile(savePath: string): Promise<RebalanceResult> {
  const backupDir = join(dirname(savePath), 'RLT Backups');
  const backupPath = join(backupDir, `${basename(savePath)}.gc-rlt-pre-rebalance-backup`);
  await mkdir(backupDir, { recursive: true });
  // Keep one current safety copy per save. A later intentional run refreshes it
  // with the save state immediately before that run.
  await copyFile(savePath, backupPath);

  const franchise = await Franchise.create(savePath);
  if (franchise.gameType !== 'college') throw new Error(`This does not look like a College Football dynasty save (detected game type: ${franchise.gameType}).`);
  const playerTable = franchise.getTableByName('Player') as unknown as PlayerTable;
  await playerTable.readRecords();
  const teamIndexes = new Set<number>();
  for (const record of playerTable.records) if (!record.isEmpty && typeof record.TeamIndex === 'number' && record.TeamIndex >= 0) teamIndexes.add(record.TeamIndex);
  const groupSummary = new Map(GROUPS.map((group) => [group.key, { key: group.key, label: group.label, moves: 0, unresolved: new Set<string>() }]));
  let totalMoves = 0;
  let teamsChanged = 0;
  for (const teamIndex of teamIndexes) {
    const roster: Player[] = playerTable.records.filter((record) => !record.isEmpty && record.TeamIndex === teamIndex).map((record) => ({ name: `${record.FirstName ?? ''} ${record.LastName ?? ''}`.trim() || 'Unknown player', overall: Number(record.OverallRating ?? 0), position: record.Position, record }));
    let teamMoves = 0;
    for (const group of GROUPS) {
      const players = roster.filter((player) => group.positions.includes(player.position));
      if (!players.length) continue;
      const result = rebalanceGroup(players, group);
      const summary = groupSummary.get(group.key)!;
      summary.moves += result.moves.length;
      result.unresolved.forEach((position) => summary.unresolved.add(position));
      teamMoves += result.moves.length;
      totalMoves += result.moves.length;
    }
    if (teamMoves) teamsChanged++;
  }
  await franchise.save(savePath, {});
  const groups = [...groupSummary.values()].map((summary) => ({ ...summary, unresolved: [...summary.unresolved] }));
  return { totalMoves, teamsProcessed: teamIndexes.size, teamsChanged, backupPath, groups, log: groups.map((group) => `${group.label}: ${group.moves} position change${group.moves === 1 ? '' : 's'}${group.unresolved.length ? ` (${group.unresolved.join(', ')} still short)` : ''}`) };
}
