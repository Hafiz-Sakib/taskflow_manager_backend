const { z } = require('zod');

/**
 * WHY: A missing or malformed env var used to surface as a cryptic runtime
 * crash minutes (or requests) after boot — e.g. `jwt.sign(undefined)`
 * throwing deep inside a controller. Validating once at startup means the
 * process refuses to boot with a clear, actionable message instead.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),

  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),
  MONGO_URI_TEST: z.string().optional(),

  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 characters'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 characters'),
  ACCESS_TOKEN_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),
  REFRESH_TOKEN_EXPIRES_IN_MS: z.coerce.number().int().positive().default(7 * 24 * 60 * 60 * 1000),

  COOKIE_SECRET: z.string().min(16, 'COOKIE_SECRET must be at least 16 characters'),

  CLIENT_URL: z.string().default('http://localhost:5173'),
  ORIGIN_WHITELIST: z.string().optional(),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),

  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error('\n❌ Invalid environment configuration:\n');
    parsed.error.issues.forEach((issue) => {
      // eslint-disable-next-line no-console
      console.error(`  • ${issue.path.join('.')}: ${issue.message}`);
    });
    // eslint-disable-next-line no-console
    console.error('\nFix your .env file (see .env.example) and restart.\n');
    process.exit(1);
  }

  return parsed.data;
}

module.exports = loadEnv();
