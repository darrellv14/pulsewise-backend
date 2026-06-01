const assessmentService = require('./heartRiskModel/assessmentService');
const orchestrationService = require('./heartRiskModel/orchestrationService');

module.exports = {
  ...assessmentService,
  ...orchestrationService,
};
