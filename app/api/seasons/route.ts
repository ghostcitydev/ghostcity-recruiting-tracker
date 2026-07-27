import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const snapshot = new URL(request.url).searchParams.get('snapshot') ?? undefined;
  try {
    const seasons = await prisma.season.findMany({
      where: snapshot ? { snapshot } : undefined,
      orderBy: [{ year: 'desc' }, { snapshot: 'desc' }],
    });
    return Response.json(seasons);
  } catch (err: any) {
    console.error('[api/seasons]', err);
    return Response.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { seasonId } = await request.json();
  if (!seasonId) return Response.json({ error: 'Missing seasonId' }, { status: 400 });

  await prisma.teamSeasonStat.deleteMany({ where: { seasonId } });
  await prisma.seasonSettings.deleteMany({ where: { seasonId } });
  await prisma.season.delete({ where: { id: seasonId } });

  return Response.json({ ok: true });
}
