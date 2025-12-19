/**
 * Configuration management for Carbon API.
 *
 * Reads from environment variables with sensible defaults for development.
 */

export interface Config {
  port: number;
  vaultPath: string;
  databasePath: string;
  googleClientId: string;
  googleClientSecret: string;
  googleRedirectUri: string;
  openaiApiKey: string;
  sessionSecret: string;
  nodeEnv: 'development' | 'production' | 'test';
}

export function getConfig(): Config {
  return {
    port: parseInt(process.env.PORT || '3000', 10),
    vaultPath: process.env.VAULT_PATH || './data/vault',
    databasePath: process.env.DATABASE_PATH || './data/carbon.db',
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    sessionSecret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
    nodeEnv: (process.env.NODE_ENV as Config['nodeEnv']) || 'development',
  };
}

/**
 * Validate that required config values are set for production
 */
export function validateConfig(config: Config): string[] {
  const errors: string[] = [];

  if (config.nodeEnv === 'production') {
    if (!config.googleClientId) errors.push('GOOGLE_CLIENT_ID is required');
    if (!config.googleClientSecret) errors.push('GOOGLE_CLIENT_SECRET is required');
    if (!config.openaiApiKey) errors.push('OPENAI_API_KEY is required');
    if (config.sessionSecret === 'dev-secret-change-in-production') {
      errors.push('SESSION_SECRET must be changed in production');
    }
  }

  return errors;
}
