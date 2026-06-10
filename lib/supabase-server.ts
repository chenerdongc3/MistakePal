import { createClient } from "@supabase/supabase-js";

export type SentenceAnalysisRow = {
  id: string;
  user_id: string | null;
  image_url: string | null;
  source_language: string | null;
  explanation_language: string | null;
  original_sentence: string | null;
  original_translation: string | null;
  translated_sentence: string | null;
  sentence_breakdown: unknown;
  vocabulary: unknown;
  grammar_points: unknown;
  similar_examples: unknown;
  learner_tip: string | null;
  chat_messages?: unknown;
  is_favorite: boolean | null;
  created_at: string | null;
  updated_at?: string | null;
};

export function getSupabaseAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  });
}

export function getSupabaseUserClient(accessToken: string) {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return null;
  }

  return createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

export function getScreenshotBucketName() {
  return process.env.SUPABASE_SCREENSHOT_BUCKET ?? "sentence-screenshots";
}

export async function getUserFromRequest(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const supabase = token ? getSupabaseUserClient(token) : null;

  if (!supabase || !token) {
    return {
      supabase,
      user: null,
      error: !token ? "Login required." : "Missing Supabase configuration.",
    };
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  return {
    supabase,
    user,
    error: error?.message,
  };
}
