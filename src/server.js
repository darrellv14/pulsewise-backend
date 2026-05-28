const env = require('./config/env');
const app = require('./app');
const { warmRedisConnection } = require('./config/redis');
const { startMedicationReminderScheduler, stopMedicationReminderScheduler } = require('./services/medicationService');

const PORT = env.port;
let server = null;

async function startServer() {
  try {
    await warmRedisConnection();
  } catch (_error) {
    // Redis tetap optional; health/cache akan melaporkan fallback bila koneksi belum tersedia.
  }

  server = app.listen(PORT, () => {
    console.log(`[SERVER] Pulse Wise API is running on http://localhost:${PORT}`);
    startMedicationReminderScheduler();
  });
}

function shutdown() {
  stopMedicationReminderScheduler();
  if (!server) {
    process.exit(0);
    return;
  }

  server.close(() => {
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

startServer();
