import { corsOrigins, isProduction, requireEnv } from './env.js';

describe('isProduction', () => {
  it.each([
    [{ NODE_ENV: 'production' }, true],
    [{ VERCEL_ENV: 'preview' }, true],
    [{ NODE_ENV: 'development' }, false],
    [{}, false],
  ])('%j → %s', (env, expected) => {
    expect(isProduction(env)).toBe(expected);
  });
});

describe('requireEnv', () => {
  it('returns the trimmed value', () => {
    expect(requireEnv('DATABASE_URL', { DATABASE_URL: ' postgres ' })).toBe(
      'postgres',
    );
  });

  it.each([{}, { DATABASE_URL: '' }, { DATABASE_URL: '  ' }])(
    'throws a clear error for %j',
    (env) => {
      expect(() => requireEnv('DATABASE_URL', env)).toThrow(
        'DATABASE_URL is not set',
      );
    },
  );
});

describe('corsOrigins', () => {
  it('splits a comma-separated list and drops trailing slashes', () => {
    expect(
      corsOrigins({
        CORS_ORIGIN: 'https://a.example, https://b.example/ ,',
        NODE_ENV: 'production',
      }),
    ).toEqual(['https://a.example', 'https://b.example']);
  });

  it('defaults to the Vite dev server in development', () => {
    expect(corsOrigins({})).toEqual(['http://localhost:5173']);
  });

  it.each([{ NODE_ENV: 'production' }, { VERCEL_ENV: 'production' }])(
    'is required in production (%j)',
    (env) => {
      expect(() => corsOrigins(env)).toThrow('CORS_ORIGIN is not set');
      expect(() => corsOrigins({ ...env, CORS_ORIGIN: ' , ' })).toThrow(
        'CORS_ORIGIN is not set',
      );
    },
  );
});
