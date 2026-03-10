const path = require('path');
const YAML = require('yamljs');

function loadOpenApiSpec() {
  const specPath = path.join(__dirname, '..', '..', 'docs', 'openapi.yaml');
  return YAML.load(specPath);
}

module.exports = {
  loadOpenApiSpec,
};
