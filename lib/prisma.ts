import { PrismaClient } from '@/app/generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'node:path';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Electron sets DATABASE_URL to its per-user database before starting the
// standalone Next server. Respect it so the migration runner and Prisma use
// the same file. Local browser development continues to use ./dev.db.
const dbUrl = process.env.DATABASE_URL ?? `file:${path.join(process.cwd(), 'dev.db')}`;

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: dbUrl }) });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
