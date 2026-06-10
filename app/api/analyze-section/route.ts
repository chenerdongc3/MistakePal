import { NextResponse } from "next/server";
import {
  GEMINI_MODEL,
  analyzeLearningSection,
  getGeminiApiKey,
} from "../../../lib/server/gemini";
import { checkRateLimit } from "../../../lib/server/rate-limit";
import type { SectionKey, SentenceAnalysisContext } from "../../../lib/types";

type AnalyzeSectionRequest = {
  analysis?: SentenceAnalysisContext;
  section?: SectionKey;
  explanationLanguage?: string;
};

export const runtime = "nodejs";

export async function POST(request: Request) {
  const startedAt = Date.now();
  const rateLimit = checkRateLimit({
    limit: 60,
    request,
    windowMs: 10 * 60 * 1000,
  });

  if (rateLimit) {
    return NextResponse.json(
      {
        error: "Too many learning requests. Please try again later.",
        code: "RATE_LIMITED",
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      },
      { status: 429 },
    );
  }

  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Missing GEMINI_API_KEY. Add it to .env.local and restart the dev server.",
        code: "AI_NOT_CONFIGURED",
      },
      { status: 500 },
    );
  }

  const body = (await request.json()) as AnalyzeSectionRequest;

  if (!body.analysis || !body.section) {
    return NextResponse.json(
      { error: "Analysis context and section are required.", code: "BAD_REQUEST" },
      { status: 400 },
    );
  }

  try {
    console.log(
      `[analyze-section] Starting ${body.section}: ${body.analysis.originalSentence}`,
    );

    const data = await analyzeLearningSection({
      apiKey,
      analysis: body.analysis,
      explanationLanguage:
        body.explanationLanguage ?? body.analysis.explanationLanguage,
      section: body.section,
    });
    const elapsedMs = Date.now() - startedAt;

    console.log(`[analyze-section] ${body.section} completed in ${elapsedMs}ms`);

    return NextResponse.json({
      section: body.section,
      data,
      debug: {
        provider: "google-ai-studio",
        model: GEMINI_MODEL,
        elapsedMs,
      },
    });
  } catch (error) {
    const elapsedMs = Date.now() - startedAt;
    console.error(
      `[analyze-section] ${body.section} failed after ${elapsedMs}ms:`,
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not analyze this section.",
        code: "AI_ANALYSIS_FAILED",
      },
      { status: 502 },
    );
  }
}
