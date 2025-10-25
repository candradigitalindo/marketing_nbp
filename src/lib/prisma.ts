import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Reduce noisy query logs by default; enable full query logs only when explicitly requested
const prismaLogs: ('query' | 'warn' | 'error')[] =
  process.env.PRISMA_LOG_QUERY === '1' ? ['query', 'warn', 'error'] : ['warn', 'error']

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: prismaLogs,
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma