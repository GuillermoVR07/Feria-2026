import "server-only"

import { envClient } from "./env.client"

// Reservado para futuras variables privadas del servidor Next.js.
// Los secretos reales de Supabase e IA deben vivir en Supabase Edge Functions.
export const envServer = {
  appName: envClient.NEXT_PUBLIC_APP_NAME,
}
