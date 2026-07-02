import { z } from "zod"

const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().min(1, "NEXT_PUBLIC_APP_NAME es requerida"),
  NEXT_PUBLIC_APP_ENV: z.enum(["demo", "development", "staging", "production"]).default("demo"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL debe ser una URL valida"),
  NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL: z
    .string()
    .url("NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL debe ser una URL valida"),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY es requerida"),
  NEXT_PUBLIC_AI_HEALTH_URL: z.string().url("NEXT_PUBLIC_AI_HEALTH_URL debe ser una URL valida"),
})

function loadClientEnv() {
  const parsed = clientEnvSchema.safeParse({
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL: process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_AI_HEALTH_URL: process.env.NEXT_PUBLIC_AI_HEALTH_URL,
  })

  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => issue.message).join("; ")
    throw new Error(`Configuracion publica invalida: ${message}`)
  }

  return parsed.data
}

export const envClient = loadClientEnv()
export type ClientEnv = typeof envClient

export function hasConfiguredSupabasePublishableKey() {
  return !envClient.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.includes("REEMPLAZAR")
}
