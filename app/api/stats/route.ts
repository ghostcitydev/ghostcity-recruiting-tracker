import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const seasonId = new URL(request.url).searchParams.get('seasonId');
  if (!seasonId) return Response.json({ error: 'Missing seasonId' }, { status: 400 });

  const stats = await prisma.teamSeasonStat.findMany({
    where: { seasonId },
    include: { team: true },
  });
  return Response.json(stats);
}

export async function PATCH(request: Request) {
  const { teamId, seasonId, isNationalChampion, isConferenceChampion } = await request.json();
  if (!teamId || !seasonId) return Response.json({ error: 'Missing teamId or seasonId' }, { status: 400 });

  const data: Record<string, boolean> = {};
  if (typeof isNationalChampion === 'boolean') data.isNationalChampion = isNationalChampion;
  if (typeof isConferenceChampion === 'boolean') data.isConferenceChampion = isConferenceChampion;

  const stat = await prisma.teamSeasonStat.updateMany({
    where: { teamId, seasonId },
    data,
  });
  return Response.json({ updated: stat.count });
}
