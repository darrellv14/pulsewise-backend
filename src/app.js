require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const env = require('./config/env');
const { buildCorsOptions } = require('./config/cors');
const { success } = require('./utils/response');
const apiRoutes = require('./routes');
const notFoundHandler = require('./middlewares/notFoundHandler');
const errorHandler = require('./middlewares/errorHandler');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

app.use(helmet());
app.use(cors(buildCorsOptions()));
app.use(express.json({ limit: env.requestBodyLimit }));
app.use(express.urlencoded({ extended: true, limit: env.requestBodyLimit }));
app.use(morgan('dev'));

app.get('/', (req, res) => {
  return success(res, 'Pulse Wise Backend API', {
    docs: isProduction ? null : '/docs',
    openApi: isProduction ? null : '/openapi.json',
    health: '/health',
    apiBase: '/',
  });
});

if (!isProduction) {
  // Load doc tooling only outside production so it does not enlarge the prod runtime surface.
  // eslint-disable-next-line global-require
  const swaggerUi = require('swagger-ui-express');
  // eslint-disable-next-line global-require
  const { loadOpenApiSpec } = require('./config/swagger');
  const openApiSpec = loadOpenApiSpec();

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));
  app.get('/openapi.json', (req, res) => {
    res.json(openApiSpec);
  });
}

app.use('/', apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
