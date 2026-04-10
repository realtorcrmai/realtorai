import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const ConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(8080),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Redis (optional in M1 — in-process worker fallback if missing)
  REDIS_URL: z.string().optional(),

  // AI
  ANTHROPIC_API_KEY: z.string().min(1),
  VOYAGE_API_KEY: z.string().optional(),

  // Email
  RESEND_API_KEY: z.string().min(1),
  RESEND_FROM_EMAIL: z.string().default('onboarding@resend.dev'),
  RESEND_WEBHOOK_SECRET: z.string().optional(),

  // Inter-service
  NEWSLETTER_SHARED_SECRET: z.string().optional(),

  // AI model + agent identity
  AI_SCORING_MODEL: z.string().default('claude-sonnet-4-20250514'),
  AGENT_NAME: z.string().default('Your Agent'),
  AGENT_PHONE: z.string().default(''),
  AGENT_EMAIL: z.string().default(''),

  // Flags
  FLAG_SAVED_SEARCH: z.enum(['on', 'off']).default('on'),
  FLAG_RAG_BACKFILL: z.enum(['on', 'off']).default('off'),
  FLAG_WEEKLY_LEARNING: z.enum(['on', 'off']).default('off'),
  FLAG_AGENT_SCORING: z.enum(['on', 'off']).default('off'),
  FLAG_PROCESS_WORKFLOWS: z.enum(['on', 'off']).default('off'),
  FLAG_AGENT_TRIAGE: z.enum(['on', 'off']).default('off'),

  // Twilio (required for SMS/WhatsApp workflow steps)
  TWILIO_ACCOUNT_SID: z.string().optional().default(''),
  TWILIO_AUTH_TOKEN: z.string().optional().default(''),
  TWILIO_PHONE_NUMBER: z.string().optional().default(''),
  TWILIO_WHATSAPP_NUMBER: z.string().optional().default(''),

  // Canary / test fixtures
  CANARY_TO_EMAIL: z.string().email().default('amandhindsa@outlook.com'),
  DEMO_REALTOR_ID: z.string().uuid().default('7de22757-dd3a-4a4f-a088-c422746e88d4'),
  TEST_CONTACT_ID: z.string().uuid().default('0922c152-09a4-4430-93c2-bba05ebda674'),
});

export type Config = z.infer<typeof ConfigSchema>;

const parsed = ConfigSchema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config: Config = parsed.data;
