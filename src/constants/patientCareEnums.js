const SYMPTOM_CODES = [
  'chest_pain',
  'shortness_of_breath',
  'palpitations',
  'dizziness',
  'headache',
  'fatigue',
  'cough',
  'swelling',
  'nausea',
  'other',
];

const BODY_AREAS = [
  'head',
  'chest',
  'neck',
  'left_arm',
  'right_arm',
  'upper_abdomen',
  'back',
  'leg',
  'general',
  'other',
];

const PAIN_FREQUENCY_CODES = {
  UNKNOWN: 0,
  LESS_THAN_30_MINUTES: 1,
  THIRTY_MINUTES_OR_MORE: 2,
};

const PAIN_LOCATION_CODES = {
  UNKNOWN: 0,
  RIGHT_ARM: 1,
  RIGHT_CHEST: 2,
  NECK: 3,
  UPPER_STERNUM: 4,
  LOWER_STERNUM: 5,
  LEFT_CHEST: 6,
  LEFT_ARM: 7,
  UPPER_ABDOMEN: 8,
};

module.exports = {
  SYMPTOM_CODES,
  BODY_AREAS,
  PAIN_FREQUENCY_CODES,
  PAIN_LOCATION_CODES,
};
