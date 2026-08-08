import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateConfig, configSchema, type Config } from './config.js';

describe('Configuration Validator', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset process.env before each test
    vi.resetModules();
    process.env = { ...originalEnv };

    // Suppress console error logs during failure tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('should return default values when optional environment variables are missing', () => {
    const emptyEnv = {};
    const config = validateConfig(emptyEnv) as Config;

    expect(config.node_env).toBe('development');
    expect(config.port).toBe(5000);
    expect(config.mongo.uri).toBe('mongodb://localhost:27017/api_monitoring');
    expect(config.postgres.port).toBe(5432);
    expect(config.cookie.secure).toBe(false);
  });

  it('should correctly parse and coerce valid custom environment variables', () => {
    const customEnv = {
      NODE_ENV: 'production',
      PORT: '8080',
      MONGO_URI: 'mongodb://user:pass@mongo.example.com:27017/prod_db',
      PG_PORT: '5433',
      RABBITMQ_PUBLISHER_CONFIRMS: 'true',
      JWT_SECRET: 'super_secret_jwt_key_123',
    };

    const config = validateConfig(customEnv) as Config;

    expect(config.node_env).toBe('production');
    expect(config.port).toBe(8080); // Coerced string to number
    expect(config.mongo.uri).toBe('mongodb://user:pass@mongo.example.com:27017/prod_db');
    expect(config.postgres.port).toBe(5433);
    expect(config.rabbitmq.publisherConfirms).toBe(true);
    expect(config.cookie.secure).toBe(true); // Since NODE_ENV === 'production'
  });

  it('should exit process and log errors when validation fails', () => {
    // Mock process.exit to prevent test runner from exiting
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null) => {
      throw new Error(`process.exit called with code ${code}`);
    });

    const invalidEnv = {
      PORT: '999', // Fails min(1000) check
      JWT_SECRET: 'short', // Fails min(8) check
      MONGO_URI: 'not-a-valid-url', // Fails url() check
    };

    // Expect function to throw due to our mocked process.exit throwing an error
    expect(() => validateConfig(invalidEnv)).toThrow('process.exit called with code 1');

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('❌ Invalid Environment Configuration')
    );
  });

  it('should test schema directly without relying on process.exit', () => {
    const invalidRawData = {
      node_env: 'invalid_env',
      port: 80, // Out of min(1000) range
    };

    const result = configSchema.safeParse(invalidRawData);

    expect(result.success).toBe(false);
    if (!result.success) {
      const issuePaths = result.error.issues.map((i) => i.path.join('.'));
      expect(issuePaths).toContain('node_env');
      expect(issuePaths).toContain('port');
    }
  });
});