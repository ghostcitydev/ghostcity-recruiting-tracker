import { PrismaClient as SqlitePrismaClient } from '@/app/generated/prisma/client';
import { PrismaClient as PostgresPrismaClient } from '@/app/generated/prisma-postgres/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaPg } from '@prisma/adapter-pg';
import path from 'node:path';

type AppPrismaClient = SqlitePrismaClient | PostgresPrismaClient;
const globalForPrisma = globalThis as unknown as { prisma?: AppPrismaClient };

const dbUrl = process.env.DATABASE_URL ?? `file:${path.join(process.cwd(), 'dev.db')}`;
const isPostgres = dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://');

export const prisma: AppPrismaClient = globalForPrisma.prisma ?? (isPostgres
  ? new PostgresPrismaClient({ adapter: new PrismaPg({ connectionString: dbUrl }) })
  : new SqlitePrismaClient({ adapter: new PrismaBetterSqlite3({ url: dbUrl }) }));

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
