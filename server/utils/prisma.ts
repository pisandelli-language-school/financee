import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
}

const env = globalThis as {
  process?: {
    env?: Record<string, string | undefined>
  }
}

const connectionString =
  env.process?.env?.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is missing for Prisma.')
}

const adapter = new PrismaMariaDb(connectionString)

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: import.meta.dev ? ['error', 'warn'] : ['error'],
  })

if (import.meta.dev) {
  globalForPrisma.prisma = prisma
}
