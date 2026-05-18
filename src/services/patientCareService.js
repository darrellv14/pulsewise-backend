const emergencyContactService = require('./patient-care/emergencyContactService');
const diaryService = require('./patient-care/diaryService');
const bodyMetricService = require('./patient-care/bodyMetricService');
const symptomService = require('./patient-care/symptomService');
const activityService = require('./patient-care/activityService');
const consumptionService = require('./patient-care/consumptionService');
const nutritionEstimationService = require('./patient-care/nutritionEstimationService');
const sleepService = require('./patient-care/sleepService');
const avatarService = require('./patient-care/avatarService');

module.exports = {
  ...emergencyContactService,
  ...diaryService,
  ...bodyMetricService,
  ...symptomService,
  ...activityService,
  ...consumptionService,
  ...nutritionEstimationService,
  ...sleepService,
  ...avatarService,
};
