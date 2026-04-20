require('dotenv').config({ override: true });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const { loadOpenApiSpec } = require('./config/swagger');
const { success } = require('./utils/response');
const apiRoutes = require('./routes');
const notFoundHandler = require('./middlewares/notFoundHandler');
const errorHandler = require('./middlewares/errorHandler');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const openApiSpec = isProduction ? null : loadOpenApiSpec();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/', (req, res) => {
  return success(res, 'Pulse Wise Backend API', {
    docs: isProduction ? null : '/docs',
    openApi: isProduction ? null : '/openapi.json',
    health: '/api/v1/health',
    apiBase: '/api/v1',
  });
});

if (!isProduction) {
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));
  app.get('/openapi.json', (req, res) => {
    res.json(openApiSpec);
  });
}

app.use('/api/v1', apiRoutes);
app.use('/api', apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
