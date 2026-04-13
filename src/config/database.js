const prisma = require('./prisma');

async function healthCheck() {
  const result = await prisma.$queryRaw`SELECT NOW() AS db_time`;
  return result[0];
}

const pool = {
  end: async () => prisma.$disconnect(),
};

module.exports = {
  pool,
  healthCheck,
};
