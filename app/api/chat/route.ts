import { NextResponse } from "next/server";

type SentenceAnalysis = {
  sourceLanguage: string;
  explanationLanguage: string;
  originalSentence: string;
  originalTranslation: string;
  translatedSentence?: string;
  sentenceBreakdown?: {
    part: string;
    explanation: string;
  }[];
  vocabulary?: {
    word: string;
    meaning: string;
    note: string;
  }[];
  grammarPoints?: {
    title: string;
    explanation: string;
  }[];
  similarExamples?: {
    sentence: string;
    translation: string;
  }[];
  learnerTip?: string;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatRequest = {
  analysis?: SentenceAnalysis;
  messages?: ChatMessage[];
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

  const body = (await request.json()) as ChatRequest;

  if (!body.analysis || !body.messages?.length) {
    return NextResponse.json(
      { error: "Analysis context and at least one message are required." },
      { status: 400 },
    );
  }

  const latestQuestion = body.messages[body.messages.length - 1];

  if (latestQuestion.role !== "user" || !latestQuestion.content.trim()) {
    return NextResponse.json(
      { error: "The latest message must be a user question." },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: buildChatPrompt({
                    analysis: body.analysis,
                    messages: body.messages,
                    explanationLanguage:
                      body.explanationLanguage ??
                      body.analysis.explanationLanguage,
                  }),
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.4,
          },
        }),
      },
    );

    const payload = (await response.json()) as GeminiResponse;

    if (!response.ok) {
      throw new Error(
        payload.error?.message ?? `Gemini request failed: ${response.status}`,
      );
    }

    const answer = payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!answer) {
      throw new Error("Gemini returned an empty answer.");
    }

    return NextResponse.json({ answer });
  } catch (error) {
    console.error("[chat] Gemini chat failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The AI tutor could not answer.",
      },
      { status: 502 },
    );
  }
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
