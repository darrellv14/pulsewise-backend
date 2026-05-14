const { patientProfileUpdateSchema } = require('../src/validators/careValidator');

describe('care validator', () => {
  test('patientProfileUpdateSchema accepts health connect fields', () => {
    const parsed = patientProfileUpdateSchema.parse({
      healthConnectPreference: 'connect_now',
      healthConnectStatus: 'connected',
    });

    expect(parsed).toEqual({
      healthConnectPreference: 'connect_now',
      healthConnectStatus: 'connected',
    });
  });

  test('patientProfileUpdateSchema accepts nullable health connect fields', () => {
    const parsed = patientProfileUpdateSchema.parse({
      healthConnectPreference: null,
      healthConnectStatus: null,
    });

    expect(parsed).toEqual({
      healthConnectPreference: null,
      healthConnectStatus: null,
    });
  });

  test('patientProfileUpdateSchema rejects invalid health connect values', () => {
    expect(() =>
      patientProfileUpdateSchema.parse({
        healthConnectPreference: 'later',
      })
    ).toThrow();

    expect(() =>
      patientProfileUpdateSchema.parse({
        healthConnectStatus: 'done',
      })
    ).toThrow();
  });
});
