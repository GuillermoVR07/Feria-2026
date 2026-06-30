// Cliente Supabase con service_role.
// IMPORTANTE: usar solo dentro de Edge Functions. Nunca importar desde frontend.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export function createSupabaseAdminClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Variables de entorno de Supabase incompletas.')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })
}
