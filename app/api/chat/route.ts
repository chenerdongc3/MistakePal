import { NextResponse } from "next/server";
import {
  answerChatQuestion,
  getGeminiApiKey,
} from "../../../lib/server/gemini";
import type { ChatMessage, SentenceAnalysis } from "../../../lib/types";

type ChatRequest = {
  analysis?: SentenceAnalysis;
  messages?: ChatMessage[];
  explanationLanguage?: string;
};

export const runtime = "nodejs";

export async function POST(request: Request) {
  const apiKey = getGeminiApiKey();

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
    const answer = await answerChatQuestion({
      apiKey,
      analysis: body.analysis,
      messages: body.messages,
      explanationLanguage:
        body.explanationLanguage ?? body.analysis.explanationLanguage,
    });

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
