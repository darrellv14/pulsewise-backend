describe('cors config', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
    jest.dontMock('dotenv');
  });

  test('allows configured origins in production mode', (done) => {
    jest.doMock('dotenv', () => ({
      config: jest.fn(),
    }));

    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      JWT_SECRET: 'super-secret',
      POSTGRES_HOST: 'postgres',
      POSTGRES_PORT: '5432',
      POSTGRES_DB: 'pulsewise',
      POSTGRES_USER: 'pulsewise',
      POSTGRES_PASSWORD: 'secret',
      CORS_ALLOW_ALL: 'false',
      CORS_ALLOWED_ORIGINS: 'https://app.example.com,https://doctor.example.com',
    };

    const { buildCorsOptions } = require('../src/config/cors');
    const options = buildCorsOptions();

    options.origin('https://doctor.example.com', (error, allowed) => {
      expect(error).toBeNull();
      expect(allowed).toBe(true);
      done();
    });
  });

  test('rejects unknown origin in production mode', (done) => {
    jest.doMock('dotenv', () => ({
      config: jest.fn(),
    }));

    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      JWT_SECRET: 'super-secret',
      POSTGRES_HOST: 'postgres',
      POSTGRES_PORT: '5432',
      POSTGRES_DB: 'pulsewise',
      POSTGRES_USER: 'pulsewise',
      POSTGRES_PASSWORD: 'secret',
      CORS_ALLOW_ALL: 'false',
      CORS_ALLOWED_ORIGINS: 'https://app.example.com',
    };

    const { buildCorsOptions } = require('../src/config/cors');
    const options = buildCorsOptions();

    options.origin('https://evil.example.com', (error) => {
      expect(error).toBeInstanceOf(Error);
      expect(error.statusCode).toBe(403);
      done();
    });
  });
});
