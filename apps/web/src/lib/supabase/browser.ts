import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import { envClient } from "@/config/env.client"

let browserClient: SupabaseClient | null = null

export function getSupabaseBrowserClient() {
  if (!browserClient) {
    browserClient = createClient(
      envClient.NEXT_PUBLIC_SUPABASE_URL,
      envClient.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      }
    )
  }

  return browserClient
}
