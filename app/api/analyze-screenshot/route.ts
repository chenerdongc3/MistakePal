import { NextResponse } from "next/server";

type OcrExtraction = {
  rawOcrText: string;
  sourceLanguage: string;
  originalSentence: string;
  originalTranslation: string;
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
  const formData = await request.formData();
  const image = formData.get("image");
  const explanationLanguage =
    formData.get("explanationLanguage")?.toString() ?? "Chinese";

  if (!(image instanceof File)) {
    return NextResponse.json(
      { error: "An image file is required." },
      { status: 400 },
    );
  }

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

  try {
    console.log(
      `[analyze-screenshot] Starting OCR: language=${explanationLanguage}, image=${image.name}, type=${image.type}`,
    );

    const extraction = await extractTextFromScreenshot({
      apiKey,
      image,
    });
    const elapsedMs = Date.now() - startedAt;

    console.log(
      `[analyze-screenshot] OCR completed in ${elapsedMs}ms: ${extraction.sourceLanguage} | ${extraction.originalSentence}`,
    );

    return NextResponse.json({
      id: crypto.randomUUID(),
      imageUrl: `/mock-uploads/${encodeURIComponent(image.name)}`,
      explanationLanguage,
      isFavorite: false,
      createdAt: new Date().toISOString(),
      debug: {
        provider: "google-ai-studio",
        model,
        elapsedMs,
        ocrElapsedMs: elapsedMs,
        rawOcrText: extraction.rawOcrText,
      },
      ...extraction,
    });
  } catch (error) {
    const elapsedMs = Date.now() - startedAt;
    console.error(`[analyze-screenshot] OCR failed after ${elapsedMs}ms:`, error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not read the screenshot. Please try again.",
      },
      { status: 502 },
    );
  }
}

async function extractTextFromScreenshot({
  apiKey,
  image,
}: {
  apiKey: string;
  image: File;
}): Promise<OcrExtraction> {
  const data = Buffer.from(await image.arrayBuffer()).toString("base64");
  const mimeType = image.type || "image/png";
  const text = await generateGeminiJson({
    apiKey,
    body: {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: buildOcrPrompt(),
            },
            {
              inline_data: {
                mime_type: mimeType,
                data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
        response_mime_type: "application/json",
        response_schema: ocrSchema,
      },
    },
  });

  const extraction = JSON.parse(stripCodeFence(text)) as OcrExtraction;

  if (!extraction.originalSentence || !extraction.originalTranslation) {
    throw new Error(
      "Could not find both the target sentence and English translation in the screenshot.",
    );
  }

  return {
    rawOcrText: extraction.rawOcrText || "",
    sourceLanguage: extraction.sourceLanguage || "Unknown",
    originalSentence: extraction.originalSentence,
    originalTranslation: extraction.originalTranslation,
  };
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

function buildOcrPrompt() {
  return `
You are an OCR and text extraction assistant for Duolingo screenshots.

Read the screenshot and extract:
1. rawOcrText: all visible learning-relevant text from the image, preserving line breaks when useful.
2. sourceLanguage: the language of the non-English target sentence.
3. originalSentence: the target language sentence or answer shown in the screenshot.
4. originalTranslation: the English translation shown below or near the target sentence.

Return only JSON that matches the schema.

Rules:
- Prefer the main sentence pair, not navigation labels, buttons, usernames, streaks, or app chrome.
- If multiple sentence pairs appear, choose the most prominent current exercise sentence pair.
- Keep originalSentence exactly as it appears in the source language.
- Keep originalTranslation exactly as the English translation appears in the screenshot.
- Do not translate or explain anything in this OCR step.
- Do not explain grammar in this step.
`.trim();
}

function stripCodeFence(value: string) {
  return value
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");
}

const ocrSchema = {
  type: "OBJECT",
  properties: {
    rawOcrText: {
      type: "STRING",
    },
    sourceLanguage: {
      type: "STRING",
    },
    originalSentence: {
      type: "STRING",
    },
    originalTranslation: {
      type: "STRING",
    },
  },
  required: [
    "rawOcrText",
    "sourceLanguage",
    "originalSentence",
    "originalTranslation",
  ],
};
