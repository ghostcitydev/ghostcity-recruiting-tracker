import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const seasonId = searchParams.get('seasonId');
  if (!seasonId) return Response.json({ error: 'Missing seasonId' }, { status: 400 });

  try {
    const rows = await prisma.signedRecruit.findMany({
      where: { seasonId },
      select: { teamId: true, firstName: true, lastName: true, position: true, posGroup: true, starRating: true, overall: true, recruitType: true },
      orderBy: [{ starRating: 'asc' }, { overall: 'desc' }],
    });
    return Response.json(rows);
  } catch (err: any) {
    return Response.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
