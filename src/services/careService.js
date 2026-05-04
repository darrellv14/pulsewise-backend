const patientProfileService = require('./care/patientProfileService');
const patientMlAssessmentService = require('./care/patientMlAssessmentService');
const doctorPatientService = require('./care/doctorPatientService');
const patientShareService = require('./care/patientShareService');
const doctorDashboardService = require('./care/doctorDashboardService');
const dashboardPairingService = require('./dashboardPairingService');

module.exports = {
  ...patientProfileService,
  ...patientMlAssessmentService,
  ...doctorPatientService,
  ...patientShareService,
  ...doctorDashboardService,
  createDashboardPairingSession: dashboardPairingService.createDashboardPairingSession,
  getDashboardPairingSessionStatus: dashboardPairingService.getDashboardPairingSessionStatus,
  confirmDashboardPairingSession: dashboardPairingService.confirmDashboardPairingSession,
};
