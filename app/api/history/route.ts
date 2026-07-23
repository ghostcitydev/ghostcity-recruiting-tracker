import { prisma } from '@/lib/prisma';

export async function GET() {
  const stats = await prisma.teamSeasonStat.findMany({
    where: { season: { snapshot: 'signing_day' } },
    include: { team: true, season: true },
    orderBy: { season: { year: 'asc' } },
  });
  return Response.json(stats);
}
