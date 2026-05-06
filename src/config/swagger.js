const path = require('path');

function loadOpenApiSpec() {
  // Optional in production because Swagger UI/OpenAPI JSON are exposed only in non-prod.
  // eslint-disable-next-line global-require
  const YAML = require('yamljs');
  const specPath = path.join(__dirname, '..', '..', 'docs', 'api', 'openapi.yaml');
  return YAML.load(specPath);
}

module.exports = {
  loadOpenApiSpec,
};
