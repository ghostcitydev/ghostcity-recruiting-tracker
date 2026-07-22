import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const seasonId = new URL(request.url).searchParams.get('seasonId');
  if (!seasonId) return Response.json({ error: 'Missing seasonId' }, { status: 400 });

  try {
    const [posRecruits, playerRatings] = await Promise.all([
      prisma.teamPositionRecruit.findMany({
        where: { seasonId },
        include: { team: true },
      }),
      prisma.teamPlayerRating.findMany({
        where: { seasonId },
        include: { team: true },
      }),
    ]);
    return Response.json({ posRecruits, playerRatings });
  } catch (err: any) {
    return Response.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
