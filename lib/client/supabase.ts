"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserSupabaseClient: SupabaseClient | null | undefined;

export function createBrowserSupabaseClient() {
  if (browserSupabaseClient !== undefined) {
    return browserSupabaseClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    browserSupabaseClient = null;
    return null;
  }

  browserSupabaseClient = createClient(supabaseUrl, anonKey);
  return browserSupabaseClient;
}

export async function getAccessToken(supabaseClient: SupabaseClient | null) {
  if (!supabaseClient) {
    return "";
  }

  const {
    data: { session },
  } = await supabaseClient.auth.getSession();

  return session?.access_token ?? "";
}
