import type {
  ChatMessage,
  OcrExtraction,
  SectionKey,
  SentenceAnalysis,
  SentenceAnalysisContext,
} from "../types";

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

export const GEMINI_MODEL = "gemini-2.5-flash";

export function getGeminiApiKey() {
  return process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY ?? "";
}

export async function extractTextFromScreenshot({
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
            { text: buildOcrPrompt() },
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

export async function analyzeLearningSection({
  apiKey,
  analysis,
  explanationLanguage,
  section,
}: {
  apiKey: string;
  analysis: SentenceAnalysisContext;
  explanationLanguage: string;
  section: SectionKey;
}) {
  const resultText = await generateGeminiJson({
    apiKey,
    body: {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: buildSectionPrompt({
                analysis,
                explanationLanguage,
                section,
              }),
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        response_mime_type: "application/json",
        response_schema: sectionSchemas[section],
      },
    },
  });

  return JSON.parse(stripCodeFence(resultText)) as Partial<SentenceAnalysis>;
}

export async function answerChatQuestion({
  apiKey,
  analysis,
  explanationLanguage,
  messages,
}: {
  apiKey: string;
  analysis: SentenceAnalysis;
  explanationLanguage: string;
  messages: ChatMessage[];
}) {
  const text = await generateGeminiText({
    apiKey,
    body: {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: buildChatPrompt({
                analysis,
                messages,
                explanationLanguage,
              }),
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.4,
      },
    },
  });

  return text.trim();
}

async function generateGeminiJson({
  apiKey,
  body,
}: {
  apiKey: string;
  body: unknown;
}) {
  return generateGeminiText({ apiKey, body });
}

async function generateGeminiText({
  apiKey,
  body,
}: {
  apiKey: string;
  body: unknown;
}) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
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

function buildChatPrompt({
  analysis,
  messages,
  explanationLanguage,
}: {
  analysis: SentenceAnalysis;
  messages: ChatMessage[];
  explanationLanguage: string;
}) {
  const conversation = messages
    .slice(-8)
    .map((message) => `${message.role}: ${message.content}`)
    .join("\n");

  return `
You are MistakePal, a patient AI tutor for language learners.

Use this sentence analysis as the learning context:

Source language: ${analysis.sourceLanguage}
Original sentence: ${analysis.originalSentence}
English translation: ${analysis.originalTranslation}
Learner-language translation: ${analysis.translatedSentence}
Sentence breakdown: ${JSON.stringify(analysis.sentenceBreakdown ?? [])}
Vocabulary: ${JSON.stringify(analysis.vocabulary ?? [])}
Grammar points: ${JSON.stringify(analysis.grammarPoints ?? [])}
Similar examples: ${JSON.stringify(analysis.similarExamples ?? [])}
Learner tip: ${analysis.learnerTip ?? ""}

Conversation so far:
${conversation}

Answer the latest user question entirely in ${explanationLanguage}.
Keep the answer concise, friendly, and focused on this sentence.
If useful, include one or two short examples.
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
    rawOcrText: { type: "STRING" },
    sourceLanguage: { type: "STRING" },
    originalSentence: { type: "STRING" },
    originalTranslation: { type: "STRING" },
  },
  required: [
    "rawOcrText",
    "sourceLanguage",
    "originalSentence",
    "originalTranslation",
  ],
};

const sectionSchemas = {
  translation: {
    type: "OBJECT",
    properties: {
      translatedSentence: { type: "STRING" },
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
            part: { type: "STRING" },
            explanation: { type: "STRING" },
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
            word: { type: "STRING" },
            meaning: { type: "STRING" },
            note: { type: "STRING" },
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
            title: { type: "STRING" },
            explanation: { type: "STRING" },
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
            sentence: { type: "STRING" },
            translation: { type: "STRING" },
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
      learnerTip: { type: "STRING" },
    },
    required: ["learnerTip"],
  },
};
