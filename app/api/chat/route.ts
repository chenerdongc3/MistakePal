import { NextResponse } from "next/server";
import { runMistakePalAgent } from "../../../lib/server/agent";
import { getGeminiApiKey } from "../../../lib/server/gemini";
import type {
  ChatMessage,
  PersonalAgentConfig,
  SentenceAnalysis,
} from "../../../lib/types";

type ChatRequest = {
  agentConfig?: PersonalAgentConfig;
  analysis?: SentenceAnalysis;
  messages?: ChatMessage[];
  explanationLanguage?: string;
};

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as ChatRequest;
  const agentConfig = normalizeAgentConfig(body.agentConfig);
  const apiKey =
    agentConfig.mode === "personal" ? agentConfig.apiKey : getGeminiApiKey();

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          agentConfig.mode === "personal"
            ? "Personal API key is required."
            : "Missing GEMINI_API_KEY. Add it to .env.local and restart the dev server.",
      },
      { status: agentConfig.mode === "personal" ? 400 : 500 },
    );
  }

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
    const result = await runMistakePalAgent({
      apiKey,
      agentConfig,
      analysis: body.analysis,
      messages: body.messages,
      explanationLanguage:
        body.explanationLanguage ?? body.analysis.explanationLanguage,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[chat] MistakePal agent failed:", error);

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

function normalizeAgentConfig(config?: PersonalAgentConfig): PersonalAgentConfig {
  if (config?.mode !== "personal") {
    return {
      mode: "platform",
      provider: "gemini",
      region: "global",
      apiKey: "",
      baseUrl: "",
      model: "",
    };
  }

  return {
    mode: "personal",
    provider:
      config.provider === "openai-compatible" ? "openai-compatible" : "gemini",
    region:
      config.region === "china" || config.region === "proxy"
        ? config.region
        : "global",
    apiKey: config.apiKey.trim(),
    baseUrl: config.baseUrl.trim(),
    model:
      config.model.trim() ||
      (config.provider === "openai-compatible" ? "gpt-4o-mini" : "gemini-2.5-flash"),
  };
}
