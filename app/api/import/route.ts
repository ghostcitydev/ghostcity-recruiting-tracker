import { importSaveFile, type SnapshotType } from '@/lib/importSave';
import { prisma } from '@/lib/prisma';

type RealignmentResult = { summary?: unknown };

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
  const { path, snapshot, realignment } = await request.json();
  if (!path || typeof path !== 'string') {
    return Response.json({ error: 'Missing save file' }, { status: 400 });
  }
  const snap: SnapshotType = snapshot === 'preseason' ? 'preseason' : 'signing_day';

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

    return Response.json(imported);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Import failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
