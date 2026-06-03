const HEART_RISK_SEX = Object.freeze({
  female: 0,
  male: 1,
});

const HEART_RISK_CHEST_PAIN_TYPE = Object.freeze({
  typical_angina: 0,
  atypical_angina: 1,
  non_anginal_pain: 2,
  asymptomatic: 3,
});

const HEART_RISK_FASTING_BLOOD_SUGAR = Object.freeze({
  lte_120_mg_dl: 0,
  gt_120_mg_dl: 1,
});

const HEART_RISK_EXERCISE_ANGINA = Object.freeze({
  no: 0,
  yes: 1,
});

const HEART_RISK_ST_SLOPE = Object.freeze({
  upsloping: 0,
  flat: 1,
  downsloping: 2,
});

module.exports = {
  HEART_RISK_SEX,
  HEART_RISK_CHEST_PAIN_TYPE,
  HEART_RISK_FASTING_BLOOD_SUGAR,
  HEART_RISK_EXERCISE_ANGINA,
  HEART_RISK_ST_SLOPE,
};
