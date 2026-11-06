import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  APP_URL: z.string().url().default('http://localhost:5173'),
  API_URL: z.string().url().default('http://localhost:4000'),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET debe tener al menos 32 caracteres'),
  ACCESS_TOKEN_TTL_MIN: z.coerce.number().default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(7),
  COOKIE_SECURE: z.string().default('false').transform((v) => v === 'true'),
  UPLOAD_DIR: z.string().default('./storage/uploads'),
  MAX_UPLOAD_MB: z.coerce.number().default(200),
  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  SMTP_FROM: z.string().default('CEHACIS <no-reply@cehacis.com>'),
  ANTHROPIC_API_KEY: z.string().optional().default(''),
  AI_MODEL: z.string().default('claude-opus-5-5'),
  PAYMENT_PROVIDER: z.enum(['sandbox', 'azul']).default('sandbox'),
  AZUL_MERCHANT_ID: z.string().optional().default(''),
  AZUL_AUTH1: z.string().optional().default(''),
  AZUL_AUTH2: z.string().optional().default(''),
  AZUL_ENV: z.enum(['sandbox', 'production']).default('sandbox'),
  VIDEO_PROVIDER: z.string().default('manual'),
  ZOOM_ACCOUNT_ID: z.string().optional().default(''),
  ZOOM_CLIENT_ID: z.string().optional().default(''),
  ZOOM_CLIENT_SECRET: z.string().optional().default(''),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Variables de entorno inválidas:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
