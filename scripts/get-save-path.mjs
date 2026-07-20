import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const s = await p.season.findFirst({ orderBy: { year: 'desc' } });
console.log(s?.sourceFile);
await p.$disconnect();
