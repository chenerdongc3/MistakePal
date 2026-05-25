import { NextResponse } from "next/server";

type SectionKey =
  | "translation"
  | "breakdown"
  | "vocabulary"
  | "grammar"
  | "examples"
  | "tip";

type SentenceAnalysisContext = {
  sourceLanguage: string;
  explanationLanguage: string;
  originalSentence: string;
  originalTranslation: string;
};

type AnalyzeSectionRequest = {
  analysis?: SentenceAnalysisContext;
  section?: SectionKey;
  explanationLanguage?: string;
};

type GeminiResponse = {
  candidates?: {
    content?: {
      parts?: {
        text?: string;
      }[];
    };
  }[];
  error?: {
    message?: string;
  };
};

export const runtime = "nodejs";

const model = "gemini-2.5-flash";

export async function POST(request: Request) {
  const startedAt = Date.now();
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Missing GEMINI_API_KEY. Add it to .env.local and restart the dev server.",
      },
      { status: 500 },
    );
  }

  const body = (await request.json()) as AnalyzeSectionRequest;

  if (!body.analysis || !body.section) {
    return NextResponse.json(
      { error: "Analysis context and section are required." },
      { status: 400 },
    );
  }

  try {
    console.log(
      `[analyze-section] Starting ${body.section}: ${body.analysis.originalSentence}`,
    );

    const resultText = await generateGeminiJson({
      apiKey,
      body: {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: buildSectionPrompt({
                  analysis: body.analysis,
                  explanationLanguage:
                    body.explanationLanguage ??
                    body.analysis.explanationLanguage,
                  section: body.section,
                }),
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          response_mime_type: "application/json",
          response_schema: sectionSchemas[body.section],
        },
      },
    });

    const elapsedMs = Date.now() - startedAt;
    console.log(`[analyze-section] ${body.section} completed in ${elapsedMs}ms`);

    return NextResponse.json({
      section: body.section,
      data: JSON.parse(stripCodeFence(resultText)),
      debug: {
        provider: "google-ai-studio",
        model,
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
      },
      { status: 502 },
    );
  }
}

async function generateGeminiJson({
  apiKey,
  body,
}: {
  apiKey: string;
  body: unknown;
}) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  const payload = (await response.json()) as GeminiResponse;

  if (!response.ok) {
    throw new Error(
      payload.error?.message ?? `Gemini request failed: ${response.status}`,
    );
  }

  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return text;
}

function buildSectionPrompt({
  analysis,
  explanationLanguage,
  section,
}: {
  analysis: SentenceAnalysisContext;
  explanationLanguage: string;
  section: SectionKey;
}) {
  return `
You are MistakePal, a language learning assistant.

Analyze only this requested section: ${section}

Source language: ${analysis.sourceLanguage}
Source language sentence: ${analysis.originalSentence}
English translation shown in screenshot: ${analysis.originalTranslation}
Learner's preferred explanation language: ${explanationLanguage}

Return only JSON that matches the schema.
All user-facing generated content must be in ${explanationLanguage}, except original source-language example sentences.
For vocabulary, meaning and note must be in ${explanationLanguage}.
For sentenceBreakdown, explanation must be in ${explanationLanguage}.
For grammarPoints, title and explanation must be in ${explanationLanguage}.
For similarExamples, sentence should stay in ${analysis.sourceLanguage}, but translation must be in ${explanationLanguage}.
For learnerTip, write the full tip in ${explanationLanguage}.
Keep the answer concise and beginner-friendly.
`.trim();
}

function stripCodeFence(value: string) {
  return value
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");
}

const sectionSchemas = {
  translation: {
    type: "OBJECT",
    properties: {
      translatedSentence: {
        type: "STRING",
      },
    },
    required: ["translatedSentence"],
  },
  breakdown: {
    type: "OBJECT",
    properties: {
      sentenceBreakdown: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            part: {
              type: "STRING",
            },
            explanation: {
              type: "STRING",
            },
          },
          required: ["part", "explanation"],
        },
      },
    },
    required: ["sentenceBreakdown"],
  },
  vocabulary: {
    type: "OBJECT",
    properties: {
      vocabulary: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            word: {
              type: "STRING",
            },
            meaning: {
              type: "STRING",
            },
            note: {
              type: "STRING",
            },
          },
          required: ["word", "meaning", "note"],
        },
      },
    },
    required: ["vocabulary"],
  },
  grammar: {
    type: "OBJECT",
    properties: {
      grammarPoints: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            title: {
              type: "STRING",
            },
            explanation: {
              type: "STRING",
            },
          },
          required: ["title", "explanation"],
        },
      },
    },
    required: ["grammarPoints"],
  },
  examples: {
    type: "OBJECT",
    properties: {
      similarExamples: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            sentence: {
              type: "STRING",
            },
            translation: {
              type: "STRING",
            },
          },
          required: ["sentence", "translation"],
        },
      },
    },
    required: ["similarExamples"],
  },
  tip: {
    type: "OBJECT",
    properties: {
      learnerTip: {
        type: "STRING",
      },
    },
    required: ["learnerTip"],
  },
};
