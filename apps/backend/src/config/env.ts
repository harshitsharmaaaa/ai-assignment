import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),
  PORT: z.coerce.number().int().positive().default(4000),
  WEB_ORIGIN: z.string().url("WEB_ORIGIN must be a valid URL"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables");
  }
  return parsed.data;
}
