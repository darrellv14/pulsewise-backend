const { listDoctorDashboardPatients } = require('./dashboard/listService');
const {
  getDoctorDashboardPatientSummary,
  getPatientSelfDashboardSummary,
} = require('./dashboard/summaryService');
const {
  getDoctorDashboardPatientVitals,
  getPatientSelfDashboardVitals,
} = require('./dashboard/vitalsService');
const {
  getDoctorDashboardAbnormalReport,
  getPatientSelfDashboardAbnormalReport,
} = require('./dashboard/abnormalReportService');

module.exports = {
  listDoctorDashboardPatients,
  getDoctorDashboardPatientSummary,
  getPatientSelfDashboardSummary,
  getDoctorDashboardPatientVitals,
  getPatientSelfDashboardVitals,
  getDoctorDashboardAbnormalReport,
  getPatientSelfDashboardAbnormalReport,
};
