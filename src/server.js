require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const swaggerUi = require("swagger-ui-express");
const env = require("./config/env");
const { loadOpenApiSpec } = require("./config/swagger");
const apiRoutes = require("./routes");
const notFoundHandler = require("./middlewares/notFoundHandler");
const errorHandler = require("./middlewares/errorHandler");

const app = express();
const PORT = env.port;
const openApiSpec = loadOpenApiSpec();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// API documentation endpoint.
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));
app.get("/openapi.json", (req, res) => {
  res.json(openApiSpec);
});

// Register API routes with versioned path and backward compatibility alias.
app.use("/api/v1", apiRoutes);
app.use("/api", apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

// Start Server
app.listen(PORT, () => {
  console.log(`[SERVER] Pulse Wise API is running on http://localhost:${PORT}`);
});
