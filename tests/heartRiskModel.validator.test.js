const {
  heartRiskAssessmentCreateSchema,
  heartRiskAssessmentUpdateSchema,
} = require('../src/validators/heartRiskModelValidator');

describe('heartRiskModel validator', () => {
  test('accepts official enum strings and normalizes them into numeric model codes', () => {
    const result = heartRiskAssessmentCreateSchema.parse({
      assessmentDate: '2026-06-05',
      age: 58,
      sex: 'female',
      chest_pain_type: 'asymptomatic',
      resting_bp_s: 151,
      fasting_blood_sugar: 'lte_120_mg_dl',
      max_heart_rate: 118,
      exercise_angina: 'no',
      old_peak: 0,
      st_slope: 'downsloping',
    });

    expect(result).toMatchObject({
      sex: 0,
      chest_pain_type: 3,
      fasting_blood_sugar: 0,
      exercise_angina: 0,
      st_slope: 2,
    });
  });

  test('keeps accepting numeric codes for backward compatibility', () => {
    const result = heartRiskAssessmentCreateSchema.parse({
      assessmentDate: '2026-06-05',
      age: 58,
      sex: 1,
      chest_pain_type: 2,
      resting_bp_s: 151,
      fasting_blood_sugar: 1,
      max_heart_rate: 118,
      exercise_angina: 1,
      old_peak: 0.5,
      st_slope: 1,
    });

    expect(result).toMatchObject({
      sex: 1,
      chest_pain_type: 2,
      fasting_blood_sugar: 1,
      exercise_angina: 1,
      st_slope: 1,
    });
  });

  test('rejects unofficial enum strings', () => {
    const result = heartRiskAssessmentUpdateSchema.safeParse({
      chest_pain_type: 'weird_value',
    });

    expect(result.success).toBe(false);
    expect(result.error.issues[0].path).toEqual(['chest_pain_type']);
  });
});
