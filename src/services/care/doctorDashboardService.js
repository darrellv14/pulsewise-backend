const { listDoctorDashboardPatients } = require('./dashboard/listService');
const { getDoctorDashboardPatientSummary } = require('./dashboard/summaryService');
const { getDoctorDashboardPatientVitals } = require('./dashboard/vitalsService');
const { getDoctorDashboardAbnormalReport } = require('./dashboard/abnormalReportService');

module.exports = {
  listDoctorDashboardPatients,
  getDoctorDashboardPatientSummary,
  getDoctorDashboardPatientVitals,
  getDoctorDashboardAbnormalReport,
};
