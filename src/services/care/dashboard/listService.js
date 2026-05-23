const {
  env,
  dashboardRepository,
  normalizePaginationInput,
  getOrSetJson,
  dashboardPatientsListKey,
  buildPagination,
  toNumberOrNull,
  toDateOnlyIso,
  calculateAge,
  latestIso,
  buildLatestVitalField,
  assertDoctorScope,
} = require('./shared');

function selectLatestField({ manualValue, manualMeasuredAt, biometricValue, biometricMeasuredAt }) {
  const normalizedManualMeasuredAt = manualMeasuredAt || null;
  const normalizedBiometricMeasuredAt = biometricMeasuredAt || null;

  if (
    normalizedManualMeasuredAt &&
    (!normalizedBiometricMeasuredAt || normalizedManualMeasuredAt >= normalizedBiometricMeasuredAt)
  ) {
    return {
      value: toNumberOrNull(manualValue),
      measuredAt: normalizedManualMeasuredAt,
    };
  }

  return {
    value: toNumberOrNull(biometricValue),
    measuredAt: normalizedBiometricMeasuredAt,
  };
}

async function listDoctorDashboardPatients({ actor, doctorId, query }) {
  assertDoctorScope({ actor, doctorId });

  return getOrSetJson(
    dashboardPatientsListKey({ doctorId, query: query || {} }),
    env.cache.dashboardListTtlSeconds,
    async () => {
      const pagination = normalizePaginationInput(query);
      const offset = (pagination.page - 1) * pagination.limit;

      const result = await dashboardRepository.listDoctorDashboardPatients({
        doctorId,
        q: query.q,
        limit: pagination.limit,
        offset,
      });

      return {
        items: result.items.map((item) => {
          const latestHeartRate = selectLatestField({
            manualValue: item.latest_manual_heart_rate,
            manualMeasuredAt: item.latest_manual_heart_rate_measured_at,
            biometricValue: item.latest_heart_rate,
            biometricMeasuredAt: item.latest_heart_rate_measured_at,
          });
          const latestOxygenSaturation = selectLatestField({
            manualValue: item.latest_manual_oxygen_saturation,
            manualMeasuredAt: item.latest_manual_oxygen_saturation_measured_at,
            biometricValue: item.latest_oxygen_saturation,
            biometricMeasuredAt: item.latest_oxygen_saturation_measured_at,
          });

          return {
            latestVitalsByField: {
              systolicBp: buildLatestVitalField(
                toNumberOrNull(item.latest_systolic_bp),
                item.latest_measured_at
              ),
              diastolicBp: buildLatestVitalField(
                toNumberOrNull(item.latest_diastolic_bp),
                item.latest_measured_at
              ),
              heartRate: buildLatestVitalField(latestHeartRate.value, latestHeartRate.measuredAt),
              oxygenSaturation: buildLatestVitalField(
                latestOxygenSaturation.value,
                latestOxygenSaturation.measuredAt
              ),
              weight: buildLatestVitalField(
                toNumberOrNull(item.latest_weight),
                item.latest_measured_at
              ),
              height: buildLatestVitalField(
                toNumberOrNull(item.latest_height),
                item.latest_measured_at
              ),
              bmi: buildLatestVitalField(toNumberOrNull(item.latest_bmi), item.latest_measured_at),
            },
            patientId: item.patient_id,
            firstName: item.first_name,
            lastName: item.last_name,
            email: item.email,
            dateOfBirth: toDateOnlyIso(item.date_of_birth),
            age: calculateAge(item.date_of_birth),
            sex: item.sex || null,
            latestVitals: {
              measuredAt: latestIso(
                item.latest_measured_at,
                latestHeartRate.measuredAt,
                latestOxygenSaturation.measuredAt
              ),
              systolicBp: toNumberOrNull(item.latest_systolic_bp),
              diastolicBp: toNumberOrNull(item.latest_diastolic_bp),
              heartRate: latestHeartRate.value,
              oxygenSaturation: latestOxygenSaturation.value,
              weight: toNumberOrNull(item.latest_weight),
              height: toNumberOrNull(item.latest_height),
              bmi: toNumberOrNull(item.latest_bmi),
            },
          };
        }),
        pagination: buildPagination({
          page: pagination.page,
          limit: pagination.limit,
          totalItems: result.totalItems,
        }),
      };
    }
  );
}

module.exports = {
  listDoctorDashboardPatients,
};
