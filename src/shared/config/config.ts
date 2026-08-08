import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

// Helper to coerce string booleans safely from env inputs
const booleanSchema = z
  .union([z.boolean(), z.string()])
  .transform((val) => {
    if (typeof val === 'boolean') return val;
    return val.toLowerCase() === 'true' || val === '1';
  });

export const configSchema = z.object({
  node_env: z.enum(['development', 'production', 'test']).default('development'),
  port: z.coerce.number().min(1000).max(65535).default(5000),

  mongo: z.object({
    uri: z.string().default('mongodb://localhost:27017/watchdog'),
    dbName: z.string().optional(),
  }),

  postgres: z.object({
    host: z.string().default('localhost'),
    port: z.coerce.number().default(5432),
    database: z.string().optional(),
    user: z.string().optional(),
    password: z.string().optional(),
  }),

  rabbitmq: z.object({
    url: z.string().optional(),
    queue: z.string().optional(),
    publisherConfirms: booleanSchema.default(false),
    retryAttempts: z.coerce.number().optional(),
    retryDelay: z.coerce.number().optional(),
  }),

  jwt: z.object({
    secret: z.string().min(8),
    expiresIn: z.string().default('1d'),
  }),

  rateLimit: z.object({
    windowMs: z.coerce.number().default(15 * 60 * 1000),
    maxRequests: z.coerce.number().default(100),
  }),

  cookie: z.object({
    httpOnly: z.boolean().default(true),
    secure: z.boolean().default(false),
    expiresIn: z.number().default(24 * 60 * 60 * 1000),
  }),
});

export type Config = z.infer<typeof configSchema>;

export function buildRawConfig(env: Record<string, string | undefined> = process.env) {
  // Construct MongoDB URI if separate credentials exist but MONGO_URI is missing
  const mongoUri =
    env.MONGO_URI ||
    (env.MONGO_USER && env.MONGO_PASSWORD
      ? `mongodb://${env.MONGO_USER}:${env.MONGO_PASSWORD}@localhost:27017/${env.MONGO_DB_NAME || 'watchdog'}?authSource=admin`
      : undefined);

  return {
    node_env: env.NODE_ENV,
    port: env.PORT,
    mongo: {
      uri: mongoUri,
      dbName: env.MONGO_DB_NAME,
    },
    postgres: {
      host: env.PG_HOST,
      port: env.PG_PORT,
      database: env.PG_DATABASE,
      user: env.PG_USER,
      password: env.PG_PASSWORD,
    },
    rabbitmq: {
      url: env.RABBITMQ_URL,
      queue: env.RABBITMQ_QUEUE,
      publisherConfirms: env.RABBITMQ_PUBLISHER_CONFIRMS,
      retryAttempts: env.RABBITMQ_RETRY_ATTEMPTS,
      retryDelay: env.RABBITMQ_RETRY_DELAY,
    },
    jwt: {
      secret: env.JWT_SECRET,
      expiresIn: env.JWT_EXPIRES_IN,
    },
    rateLimit: {
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
    },
    cookie: {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      expiresIn: 24 * 60 * 60 * 1000,
    },
  };
}

export function validateConfig(customEnv?: Record<string, string | undefined>): Config {
  const rawConfig = buildRawConfig(customEnv ?? process.env);
  const parseResult = configSchema.safeParse(rawConfig);

  if (!parseResult.success) {
    console.error('\n❌ Invalid Environment Configuration:\n');

    parseResult.error.issues.forEach((issue) => {
      const fieldPath = issue.path.join('.');
      console.error(`  - \x1b[33m${fieldPath}\x1b[0m: ${issue.message}`);
    });

    console.error('\nPlease check your .env file or environment settings before restarting the app.\n');
    process.exit(1);
  }

  return parseResult.data;
}

export const config: Config =
  process.env.NODE_ENV === 'test' ? ({} as Config) : validateConfig();

export default config;