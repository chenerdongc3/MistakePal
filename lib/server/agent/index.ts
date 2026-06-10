import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";
import type { ToolCall } from "@langchain/core/messages/tool";
import { GEMINI_MODEL } from "../gemini";
import { createLearningTools } from "./tools";
import type {
  LearningToolEvent,
  RunLearningAgentInput,
  RunLearningAgentOutput,
} from "./types";

export async function runMistakePalAgent({
  apiKey,
  agentConfig,
  analysis,
  explanationLanguage,
  messages,
}: RunLearningAgentInput): Promise<RunLearningAgentOutput> {
  if (agentConfig?.mode === "personal") {
    if (agentConfig.provider === "openai-compatible") {
      return runOpenAICompatibleAgent({
        agentConfig,
        analysis,
        explanationLanguage,
        messages,
      });
    }

    apiKey = agentConfig.apiKey;
  }

  const toolEvents: LearningToolEvent[] = [];
  const tools = createLearningTools({
    apiKey,
    analysis,
    explanationLanguage,
    toolEvents,
  });
  const toolByName = new Map(tools.map((tool) => [tool.name, tool]));
  const model = new ChatGoogleGenerativeAI({
    apiKey,
    model:
      agentConfig?.mode === "personal" && agentConfig.model
        ? agentConfig.model
        : GEMINI_MODEL,
    temperature: 0.3,
  });
  const modelWithTools = model.bindTools(tools as never);
  const latestQuestion = messages[messages.length - 1]?.content ?? "";
  const baseMessages = buildAgentMessages({
    analysis,
    explanationLanguage,
    messages,
  });
  const metadata = {
    sourceLanguage: analysis.sourceLanguage,
    explanationLanguage,
    analysisId: analysis.id,
    toolNames: tools.map((tool) => tool.name),
  };

  const firstResponse = (await modelWithTools.invoke(baseMessages, {
    runName: "mistakepal_agent_decide_tools",
    metadata,
  })) as AIMessage;
  const toolCalls = getToolCalls(firstResponse);

  if (toolCalls.length === 0) {
    return {
      answer: getMessageText(firstResponse),
      toolEvents,
    };
  }

  const toolMessages = await Promise.all(
    toolCalls.map(async (toolCall) => {
      const selectedTool = toolByName.get(toolCall.name);

      if (!selectedTool) {
        return new ToolMessage({
          content: JSON.stringify({
            error: `Unknown tool: ${toolCall.name}`,
          }),
          name: toolCall.name,
          status: "error",
          tool_call_id: toolCall.id ?? crypto.randomUUID(),
        });
      }

      const result = await selectedTool.invoke(toolCall.args ?? {}, {
        runName: `mistakepal_tool_${toolCall.name}`,
        metadata: {
          ...metadata,
          latestQuestion,
          toolName: toolCall.name,
        },
      });

      return new ToolMessage({
        content: normalizeToolResult(result),
        name: toolCall.name,
        status: getLatestToolStatus(toolEvents, toolCall.name),
        tool_call_id: toolCall.id ?? crypto.randomUUID(),
      });
    }),
  );

  const finalResponse = await model.invoke(
    [
      ...baseMessages,
      firstResponse,
      ...toolMessages,
      new HumanMessage(
        `Use the tool results above to answer the learner's latest question in ${explanationLanguage}. Do not mention internal tool JSON unless it is useful to the learner.`,
      ),
    ],
    {
      runName: "mistakepal_agent_final_answer",
      metadata,
    },
  );

  return {
    answer: getMessageText(finalResponse),
    toolEvents,
  };
}

type OpenAICompatibleResponse = {
  choices?: {
    message?: {
      content?: string | null;
    };
  }[];
  error?: {
    message?: string;
  };
};

async function runOpenAICompatibleAgent({
  agentConfig,
  analysis,
  explanationLanguage,
  messages,
}: Omit<RunLearningAgentInput, "apiKey"> & {
  agentConfig: NonNullable<RunLearningAgentInput["agentConfig"]>;
}): Promise<RunLearningAgentOutput> {
  const baseUrl = normalizeOpenAIBaseUrl(agentConfig.baseUrl);
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${agentConfig.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: agentConfig.model,
      temperature: 0.3,
      messages: buildOpenAICompatibleMessages({
        analysis,
        explanationLanguage,
        messages,
      }),
    }),
  });
  const payload = (await response.json().catch(() => null)) as
    | OpenAICompatibleResponse
    | null;

  if (!response.ok) {
    throw new Error(
      payload?.error?.message ??
        `Personal API request failed: ${response.status}`,
    );
  }

  const answer = payload?.choices?.[0]?.message?.content?.trim();

  if (!answer) {
    throw new Error("Personal API returned an empty response.");
  }

  return {
    answer,
    toolEvents: [],
  };
}

function buildAgentMessages({
  analysis,
  explanationLanguage,
  messages,
}: Omit<RunLearningAgentInput, "apiKey" | "agentConfig">): BaseMessage[] {
  const conversation = messages
    .slice(-8)
    .map((message) => `${message.role}: ${message.content}`)
    .join("\n");

  return [
    new SystemMessage(`
You are MistakePal, a focused AI tutor for language learners.

Answer entirely in ${explanationLanguage}.
Only help with the current sentence and its language-learning context.
Use tools when the learner asks for sentence breakdown, vocabulary, grammar, similar examples, or learner tips.
Do not call tools for OCR, saving favorites, deleting favorites, account management, payment, or unrelated tasks.
If the answer is simple and already clear from context, answer directly without tools.
Keep responses concise, practical, and beginner-friendly.
`.trim()),
    new HumanMessage(`
Current sentence context:
- Analysis ID: ${analysis.id}
- Source language: ${analysis.sourceLanguage}
- Original sentence: ${analysis.originalSentence}
- English translation from screenshot: ${analysis.originalTranslation}
- Learner-language translation: ${analysis.translatedSentence ?? ""}
- Existing sentence breakdown: ${JSON.stringify(analysis.sentenceBreakdown ?? [])}
- Existing vocabulary: ${JSON.stringify(analysis.vocabulary ?? [])}
- Existing grammar points: ${JSON.stringify(analysis.grammarPoints ?? [])}
- Existing similar examples: ${JSON.stringify(analysis.similarExamples ?? [])}
- Existing learner tip: ${analysis.learnerTip ?? ""}

Conversation so far:
${conversation}
`.trim()),
  ];
}

function buildOpenAICompatibleMessages({
  analysis,
  explanationLanguage,
  messages,
}: Omit<RunLearningAgentInput, "apiKey" | "agentConfig">) {
  const system = `
You are MistakePal, a focused AI tutor for language learners.

Answer entirely in ${explanationLanguage}.
Only help with the current sentence and its language-learning context.
Use the provided OCR result, sentence breakdown, vocabulary, grammar, examples, and learner tip when available.
If a requested detail is missing, infer carefully from the current sentence instead of inventing unrelated context.
Do not help with OCR, saving favorites, deleting favorites, account management, payment, or unrelated tasks.
Keep responses concise, practical, and beginner-friendly.
`.trim();
  const context = `
Current sentence context:
- Analysis ID: ${analysis.id}
- Source language: ${analysis.sourceLanguage}
- Original sentence: ${analysis.originalSentence}
- English translation from screenshot: ${analysis.originalTranslation}
- Learner-language translation: ${analysis.translatedSentence ?? ""}
- Existing sentence breakdown: ${JSON.stringify(analysis.sentenceBreakdown ?? [])}
- Existing vocabulary: ${JSON.stringify(analysis.vocabulary ?? [])}
- Existing grammar points: ${JSON.stringify(analysis.grammarPoints ?? [])}
- Existing similar examples: ${JSON.stringify(analysis.similarExamples ?? [])}
- Existing learner tip: ${analysis.learnerTip ?? ""}
`.trim();

  return [
    {
      role: "system",
      content: system,
    },
    {
      role: "user",
      content: context,
    },
    ...messages.slice(-8).map((message) => ({
      role: message.role,
      content: message.content,
    })),
  ];
}

function normalizeOpenAIBaseUrl(baseUrl: string) {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");

  if (!trimmed) {
    return "https://api.openai.com/v1";
  }

  return trimmed.endsWith("/v1") ? trimmed : `${trimmed}/v1`;
}

function getToolCalls(message: AIMessage): ToolCall[] {
  return (message.tool_calls ?? []).slice(0, 3);
}

function getMessageText(message: BaseMessage) {
  const { content } = message;

  if (typeof content === "string") {
    return content.trim();
  }

  return content
    .map((part) => {
      if (typeof part === "string") {
        return part;
      }

      if ("text" in part && typeof part.text === "string") {
        return part.text;
      }

      return "";
    })
    .join("")
    .trim();
}

function normalizeToolResult(result: unknown) {
  if (typeof result === "string") {
    return result;
  }

  return JSON.stringify(result);
}

function getLatestToolStatus(
  toolEvents: LearningToolEvent[],
  toolName: string,
): "success" | "error" {
  const event = toolEvents.findLast((toolEvent) => toolEvent.name === toolName);
  return event?.status === "failed" ? "error" : "success";
}
