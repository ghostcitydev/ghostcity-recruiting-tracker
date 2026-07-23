import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const seasonId = searchParams.get('seasonId');
  if (!seasonId) return Response.json({ error: 'Missing seasonId' }, { status: 400 });

  try {
    const rows = await prisma.teamPipelinePositionRecruit.findMany({
      where: { seasonId },
      select: { teamId: true, pipeline: true, posGroup: true, fiveStars: true, fourStars: true, threeStars: true, twoStars: true, oneStars: true, total: true },
      orderBy: [{ pipeline: 'asc' }, { posGroup: 'asc' }],
    });
    return Response.json(rows);
  } catch (err: any) {
    return Response.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
