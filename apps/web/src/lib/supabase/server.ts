import "server-only"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import { envClient } from "@/config/env.client"

let serverClient: SupabaseClient | null = null

export function getSupabaseServerClient() {
  if (!serverClient) {
    serverClient = createClient(
      envClient.NEXT_PUBLIC_SUPABASE_URL,
      envClient.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    )
  }

  return serverClient
}
