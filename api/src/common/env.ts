const DEV_WEB_ORIGIN = 'http://localhost:5173';

type Env = Record<string, string | undefined>;

/** Deployed (Vercel sets VERCEL_ENV on every deployment) or explicitly production. */
export function isProduction(env: Env = process.env): boolean {
  return env.NODE_ENV === 'production' || Boolean(env.VERCEL_ENV);
}

/** The value of `name`, or a clear startup error when it's missing. */
export function requireEnv(name: string, env: Env = process.env): string {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(
      `${name} is not set. Add it to api/.env (or the Vercel project).`,
    );
  }
  return value;
}

/**
 * Exact origins allowed by CORS, from the comma-separated `CORS_ORIGIN`. Required in
 * production, so a deployed API never falls back to allowing localhost.
 */
export function corsOrigins(env: Env = process.env): string[] {
  const origins = (env.CORS_ORIGIN ?? '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
  if (origins.length > 0) return origins;
  if (isProduction(env)) {
    throw new Error(
      'CORS_ORIGIN is not set. In production it must list the web app origin(s), e.g. https://openslot.vercel.app.',
    );
  }
  return [DEV_WEB_ORIGIN];
}
