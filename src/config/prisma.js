const { PrismaClient } = require('@prisma/client');

const globalForPrisma = globalThis;
const shouldUseAccelerate =
  process.env.PRISMA_ACCELERATE_ENABLED === 'true' ||
  String(process.env.DATABASE_URL || '').startsWith('prisma://');

let withAccelerate = null;
if (shouldUseAccelerate) {
  try {
    ({ withAccelerate } = require('@prisma/extension-accelerate'));
  } catch (_error) {
    throw new Error(
      'Prisma Accelerate aktif tetapi package @prisma/extension-accelerate belum terpasang'
    );
  }
}

const prisma =
  globalForPrisma.__pulsewisePrismaClient ||
  (() => {
    const client = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });

    return shouldUseAccelerate && withAccelerate ? client.$extends(withAccelerate()) : client;
  })();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__pulsewisePrismaClient = prisma;
}

module.exports = prisma;
