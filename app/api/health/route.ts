import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "mistakepal",
    checks: {
      geminiApiKey: Boolean(
        process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY,
      ),
      supabaseUrl: Boolean(
        process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
      ),
      supabaseAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      supabaseServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      langSmithTracing: process.env.LANGSMITH_TRACING === "true",
      langSmithApiKey: Boolean(process.env.LANGSMITH_API_KEY),
    },
  });
}
