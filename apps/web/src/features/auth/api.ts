import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

import type { LoginFormValues } from "./schemas";

export async function signInInternalUser(values: LoginFormValues) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: values.email,
    password: values.password,
  });

  if (error) {
    throw new Error(error.message || "No se pudo iniciar sesion.");
  }

  return data;
}

export async function signOutInternalUser() {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message || "No se pudo cerrar sesion.");
  }
}

export async function getCurrentAccessToken() {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message || "No se pudo leer la sesion.");
  }

  return data.session?.access_token ?? null;
}
