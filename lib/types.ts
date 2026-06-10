export type SectionKey =
  | "translation"
  | "breakdown"
  | "vocabulary"
  | "grammar"
  | "examples"
  | "tip";

export type SentenceBreakdownItem = {
  part: string;
  explanation: string;
};

export type VocabularyItem = {
  word: string;
  meaning: string;
  note: string;
};

export type GrammarPoint = {
  title: string;
  explanation: string;
};

export type SimilarExample = {
  sentence: string;
  translation: string;
};

export type SentenceAnalysisContext = {
  sourceLanguage: string;
  explanationLanguage: string;
  originalSentence: string;
  originalTranslation: string;
};

export type SentenceAnalysis = SentenceAnalysisContext & {
  id: string;
  imageUrl: string;
  translatedSentence?: string;
  sentenceBreakdown?: SentenceBreakdownItem[];
  vocabulary?: VocabularyItem[];
  grammarPoints?: GrammarPoint[];
  similarExamples?: SimilarExample[];
  learnerTip?: string;
  isFavorite: boolean;
  createdAt: string;
  debug?: {
    provider: string;
    model: string;
    elapsedMs: number;
    ocrElapsedMs?: number;
    rawOcrText?: string;
  };
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  toolEvents?: LearningToolEvent[];
};

export type LearningToolEvent = {
  name: string;
  label: string;
  status: "completed" | "failed";
};

export type PersonalAgentProvider = "gemini" | "openai-compatible";

export type PersonalAgentRegion = "global" | "china" | "proxy";

export type PersonalAgentConfig = {
  mode: "platform" | "personal";
  provider: PersonalAgentProvider;
  region: PersonalAgentRegion;
  apiKey: string;
  baseUrl: string;
  model: string;
};

export type SubscriptionPlan = "free" | "plus" | "pro";

export type SectionState = {
  isLoading: boolean;
  error?: string;
};

export type OcrExtraction = {
  rawOcrText: string;
  sourceLanguage: string;
  originalSentence: string;
  originalTranslation: string;
};

export type UiCopy = {
  language: string;
  analyzing: string;
  analyzeButton: string;
  readingButton: string;
  ocrDone: (seconds: string) => string;
  empty: string;
  ocrResult: string;
  ocrSubtitle: (language: string) => string;
  originalSentence: string;
  originalTranslation: string;
  learnOnDemand: string;
  learnOnDemandSubtitle: string;
  analyzeSection: string;
  refreshSection: string;
  analyzingSection: string;
  askTitle: string;
  askSubtitle: string;
  askPlaceholder: string;
  askButton: string;
  answering: string;
  askEmpty: string;
  save: string;
  saved: string;
  saving: string;
  favorites: string;
  favoritesEmpty: string;
};
