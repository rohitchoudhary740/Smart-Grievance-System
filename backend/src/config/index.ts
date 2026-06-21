import dotenv from 'dotenv';
dotenv.config();

function require_env(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required environment variable: ${key}`);
  return val;
}

function optional_env(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const config = {
  env: optional_env('NODE_ENV', 'development'),
  port: parseInt(optional_env('PORT', '5000'), 10),

  mongodb: {
    uri: require_env('MONGODB_URI'),
  },

  jwt: {
    secret: require_env('JWT_SECRET'),
    expiresIn: optional_env('JWT_EXPIRES_IN', '7d'),
  },

  gemini: {
    apiKey: require_env('GEMINI_API_KEY'),
    model: optional_env('GEMINI_MODEL', 'gemini-2.5-pro'),
  },

  upload: {
    dir: optional_env('UPLOAD_DIR', './uploads'),
    maxSizeMb: parseInt(optional_env('MAX_FILE_SIZE_MB', '10'), 10),
  },

  cors: {
    frontendUrl: optional_env('FRONTEND_URL', 'http://localhost:5173'),
  },

  sla: {
    cronSchedule: optional_env('SLA_CRON_SCHEDULE', '*/5 * * * *'),
  },

  isDev(): boolean {
    return this.env === 'development';
  },

  isProd(): boolean {
    return this.env === 'production';
  },
} as const;
