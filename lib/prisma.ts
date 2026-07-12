import { PrismaClient } from '@prisma/client';
import { tenantGuardExtension } from '@/lib/tenantGuard';

const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createPrismaClient> };

function createPrismaClient() {
  const base = new PrismaClient();
  return base.$extends(tenantGuardExtension);
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
