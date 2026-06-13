const REQUIRED_ENV_VARS = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DATABASE_URL',
  'JWT_SECRET',
] as const;

export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const missing = REQUIRED_ENV_VARS.filter(
    (key) => !config[key] || String(config[key]).trim() === '',
  );

  if (missing.length > 0) {
    throw new Error(
      `\n========================================================\n` +
        `  VF Agent API — STARTUP FAILED: missing env variables\n` +
        `  Missing: ${missing.join(', ')}\n` +
        `  Fix: set these in the root .env file (see .env.example)\n` +
        `========================================================\n`,
    );
  }

  const url = String(config.SUPABASE_URL);
  if (!/^https?:\/\//.test(url)) {
    throw new Error(
      `SUPABASE_URL is invalid: "${url}". It must be a full URL like https://your-project.supabase.co`,
    );
  }

  return config;
}
