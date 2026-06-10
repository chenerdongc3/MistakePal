import { tool } from "@langchain/core/tools";
import { z } from "zod";
import type { SectionKey, SentenceAnalysis } from "../../types";
import { analyzeLearningSection } from "../gemini";
import type { LearningToolEvent } from "./types";

type LearningToolDefinition = {
  name: string;
  label: string;
  description: string;
  section: SectionKey;
};

const learningToolDefinitions: LearningToolDefinition[] = [
  {
    name: "analyze_sentence_breakdown",
    label: "Sentence breakdown",
    description:
      "Break the current sentence into smaller meaningful parts and explain each part.",
    section: "breakdown",
  },
  {
    name: "analyze_vocabulary",
    label: "Key vocabulary",
    description:
      "Explain important words from the current sentence, including meaning and usage notes.",
    section: "vocabulary",
  },
  {
    name: "analyze_grammar",
    label: "Grammar points",
    description:
      "Explain grammar patterns or sentence structures in the current sentence.",
    section: "grammar",
  },
  {
    name: "generate_similar_examples",
    label: "Similar examples",
    description:
      "Generate similar example sentences for the current sentence pattern.",
    section: "examples",
  },
  {
    name: "generate_learner_tip",
    label: "Learner tip",
    description:
      "Generate one concise learning or review tip for the current sentence.",
    section: "tip",
  },
];

const toolInputSchema = z.object({
  focus: z
    .string()
    .optional()
    .describe("Optional focus from the learner's latest question."),
});

export function createLearningTools({
  apiKey,
  analysis,
  explanationLanguage,
  toolEvents,
}: {
  apiKey: string;
  analysis: SentenceAnalysis;
  explanationLanguage: string;
  toolEvents: LearningToolEvent[];
}) {
  return learningToolDefinitions.map((definition) =>
    tool(
      async () => {
        try {
          const data = await analyzeLearningSection({
            apiKey,
            analysis,
            explanationLanguage,
            section: definition.section,
          });

          toolEvents.push({
            name: definition.name,
            label: definition.label,
            status: "completed",
          });

          return JSON.stringify({
            section: definition.section,
            data,
          });
        } catch (error) {
          toolEvents.push({
            name: definition.name,
            label: definition.label,
            status: "failed",
          });

          return JSON.stringify({
            section: definition.section,
            error:
              error instanceof Error
                ? error.message
                : "The learning tool failed.",
          });
        }
      },
      {
        name: definition.name,
        description: definition.description,
        schema: toolInputSchema,
      },
    ),
  );
}
