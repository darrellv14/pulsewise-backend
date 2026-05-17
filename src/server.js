const env = require('./config/env');
const app = require('./app');
const { startMedicationReminderScheduler, stopMedicationReminderScheduler } = require('./services/medicationService');

const PORT = env.port;

// Start Server
const server = app.listen(PORT, () => {
  console.log(`[SERVER] Pulse Wise API is running on http://localhost:${PORT}`);
  startMedicationReminderScheduler();
});

function shutdown() {
  stopMedicationReminderScheduler();
  server.close(() => {
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
