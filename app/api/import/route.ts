import { importSaveFile, type SnapshotType } from '@/lib/importSave';
import { prisma } from '@/lib/prisma';

type RealignmentResult = { summary?: unknown };

type ForceWinHistoryRow = {
  week: number;
  homeTeam: string;
  awayTeam: string;
  forcedWinner: string;
  disparity?: number | null;
  probability?: number | null;
  roll?: number | null;
  talentValue?: number | null;
  matchupValue?: number | null;
  coachingValue?: number | null;
  homeFieldValue?: number | null;
  homeEnvValue?: number | null;
  reason?: string | null;
  rivalryApplied?: boolean;
  rivalryMultiplier?: number | null;
  fcsApplied?: boolean;
  fcsMultiplier?: number | null;
};
type ForceWinResult = { forcedGames?: ForceWinHistoryRow[]; involvement?: string; modelProfile?: string };

function recommendationPairs(result: unknown): Array<{ teamName: string; toConference: string }> {
  if (!result || typeof result !== 'object') return [];
  const summary = (result as RealignmentResult).summary;
  if (!Array.isArray(summary)) return [];
  return summary.flatMap((item) => {
    if (!Array.isArray(item) || item.length < 2 || typeof item[0] !== 'string' || typeof item[1] !== 'string') return [];
    return [{ toConference: item[0], teamName: item[1] }];
  });
}

export async function POST(request: Request) {
  const { path, snapshot, realignment, forceWin } = await request.json();
  if (!path || typeof path !== 'string') {
    return Response.json({ error: 'Missing save file' }, { status: 400 });
  }
  const snap: SnapshotType = snapshot === 'preseason' ? 'preseason' : snapshot === 'week_zero' ? 'week_zero' : 'signing_day';

  try {
    const imported = await importSaveFile(path, snap);

    // Save recommendations only after the import succeeds, so they are tied
    // to the exact Signing Day snapshot the user can later review.
    const hasRealignmentResult = snap === 'signing_day' && realignment !== undefined;
    const recommendations = hasRealignmentResult ? recommendationPairs(realignment) : [];
    if (hasRealignmentResult) {
      const season = await prisma.season.findUnique({ where: { year_snapshot: { year: imported.seasonYear, snapshot: imported.snapshot } } });
      if (season) {
        const teams = await prisma.team.findMany({ where: { name: { in: recommendations.map((move) => move.teamName) } }, select: { name: true, conference: true } });
        const conferenceByTeam = new Map(teams.map((team) => [team.name, team.conference]));
        await prisma.conferenceRealignmentMove.deleteMany({ where: { seasonId: season.id } });
        if (recommendations.length > 0) {
          await prisma.conferenceRealignmentMove.createMany({
            data: recommendations.map((move) => ({
              seasonId: season.id,
              teamName: move.teamName,
              fromConference: conferenceByTeam.get(move.teamName) ?? null,
              toConference: move.toConference,
            })),
          });
        }
      }
    }

    // Force Win runs as its own Week 0 import (a save's CurrentWeekType is
    // still OffSeason during Signing Day and Preseason, so Force Win -- which
    // requires RegularSeason -- can't run in either of those batches) --
    // so its results are recorded against this dedicated Week 0 season.
    const hasForceWinResult = snap === 'week_zero' && forceWin !== undefined;
    if (hasForceWinResult) {
      const result = forceWin as ForceWinResult;
      const forcedGames = Array.isArray(result?.forcedGames) ? result.forcedGames : [];
      const season = await prisma.season.findUnique({ where: { year_snapshot: { year: imported.seasonYear, snapshot: imported.snapshot } } });
      if (season) {
        await prisma.forceWinAssignment.deleteMany({ where: { seasonId: season.id } });
        if (forcedGames.length > 0) {
          await prisma.forceWinAssignment.createMany({
            data: forcedGames.map((game) => ({
              seasonId: season.id,
              week: game.week,
              homeTeam: game.homeTeam,
              awayTeam: game.awayTeam,
              forcedWinner: game.forcedWinner,
              disparity: game.disparity ?? null,
              probability: game.probability ?? null,
              roll: game.roll ?? null,
              talentValue: game.talentValue ?? null,
              matchupValue: game.matchupValue ?? null,
              coachingValue: game.coachingValue ?? null,
              homeFieldValue: game.homeFieldValue ?? null,
              homeEnvValue: game.homeEnvValue ?? null,
              reason: game.reason ?? null,
              rivalryApplied: game.rivalryApplied ?? false,
              rivalryMultiplier: game.rivalryMultiplier ?? null,
              fcsApplied: game.fcsApplied ?? false,
              fcsMultiplier: game.fcsMultiplier ?? null,
              involvement: result.involvement ?? 'medium',
              modelProfile: result.modelProfile ?? 'balanced',
            })),
          });
        }
      }
    }

    return Response.json(imported);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Import failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
