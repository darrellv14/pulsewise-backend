describe('env config', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
    jest.dontMock('dotenv');
  });

  test('fails fast in production when JWT secret uses unsafe fallback', () => {
    jest.doMock('dotenv', () => ({
      config: jest.fn(),
    }));

    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      JWT_SECRET: 'replace_with_strong_secret',
      POSTGRES_HOST: 'postgres',
      POSTGRES_DB: 'pulsewise',
      POSTGRES_USER: 'pulsewise',
      POSTGRES_PASSWORD: 'secret',
    };

    expect(() => require('../src/config/env')).toThrow(
      'Unsafe fallback is not allowed for JWT_SECRET in production'
    );
  });

  test('allows development fallback values for local work', () => {
    jest.doMock('dotenv', () => ({
      config: jest.fn(),
    }));

    process.env = {
      ...originalEnv,
      NODE_ENV: 'development',
      JWT_SECRET: 'replace_with_strong_secret',
    };

    const env = require('../src/config/env');
    expect(env.jwtSecret).toBe('replace_with_strong_secret');
    expect(env.isDevelopment).toBe(true);
  });
});
