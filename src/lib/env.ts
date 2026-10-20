import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  SEED_ADMIN_EMAIL: z.string().email("SEED_ADMIN_EMAIL must be a valid email"),
  SEED_ADMIN_PASSWORD: z.string().min(8, "SEED_ADMIN_PASSWORD must be at least 8 characters"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.format());
  throw new Error("Failed to validate environment variables. Check .env configuration.");
}

export const env = parsed.data;
