const env = require("./config/env");
const app = require("./app");

const PORT = env.port;

// Start Server
app.listen(PORT, () => {
  console.log(`[SERVER] Pulse Wise API is running on http://localhost:${PORT}`);
});
