require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Test Route
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Pulse Wise Backend is running smoothly 🚀",
    timestamp: new Date().toISOString(),
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`[SERVER] Pulse Wise API is running on http://localhost:${PORT}`);
});
