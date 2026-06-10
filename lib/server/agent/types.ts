import type {
  ChatMessage,
  PersonalAgentConfig,
  SentenceAnalysis,
} from "../../types";

export type LearningToolEvent = {
  name: string;
  label: string;
  status: "completed" | "failed";
};

export type RunLearningAgentInput = {
  apiKey: string;
  agentConfig?: PersonalAgentConfig;
  analysis: SentenceAnalysis;
  explanationLanguage: string;
  favoriteCardsLoader?: () => Promise<SentenceAnalysis[]>;
  messages: ChatMessage[];
};

export type RunLearningAgentOutput = {
  answer: string;
  toolEvents: LearningToolEvent[];
};
