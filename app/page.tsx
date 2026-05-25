"use client";

import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { useEffect, useState } from "react";

type SectionKey =
  | "translation"
  | "breakdown"
  | "vocabulary"
  | "grammar"
  | "examples"
  | "tip";

type SentenceAnalysis = {
  id: string;
  imageUrl: string;
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

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type SectionState = {
  isLoading: boolean;
  error?: string;
};

type UiCopy = {
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

const explanationLanguages = [
  "Chinese",
  "English",
  "Japanese",
  "Korean",
  "Spanish",
  "French",
];

const learningSections: {
  key: SectionKey;
}[] = [
  {
    key: "breakdown",
  },
  {
    key: "vocabulary",
  },
  {
    key: "grammar",
  },
  {
    key: "examples",
  },
  {
    key: "tip",
  },
];

export default function Home() {
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [explanationLanguage, setExplanationLanguage] = useState("Chinese");
  const [analysis, setAnalysis] = useState<SentenceAnalysis | null>(null);
  const [favorites, setFavorites] = useState<SentenceAnalysis[]>([]);
  const [sectionStates, setSectionStates] = useState<
    Partial<Record<SectionKey, SectionState>>
  >({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSavingFavorite, setIsSavingFavorite] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [error, setError] = useState("");
  const [analysisStatus, setAnalysisStatus] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const copy = getUiCopy(explanationLanguage);

  useEffect(() => {
    fetchFavorites();
  }, []);

  useEffect(() => {
    if (!image) {
      setPreviewUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(image);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [image]);

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    setImage(event.target.files?.[0] ?? null);
    setError("");
  }

  async function fetchFavorites() {
    try {
      const response = await fetch("/api/favorites");

      if (!response.ok) {
        throw new Error("Could not load favorites.");
      }

      const data = (await response.json()) as SentenceAnalysis[];
      setFavorites(data.slice(0, 5));
    } catch {
      setFavorites([]);
    }
  }

  async function handleAnalyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!image) {
      setError("Please upload a screenshot before analyzing.");
      return;
    }

    const formData = new FormData();
    formData.append("image", image);
    formData.append("explanationLanguage", explanationLanguage);

    setIsAnalyzing(true);
    setAnalysisStatus(copy.analyzing);

    try {
      const startedAt = performance.now();
      const response = await fetch("/api/analyze-screenshot", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(
          errorData?.error ?? "The screenshot OCR failed. Please try again.",
        );
      }

      const data = (await response.json()) as SentenceAnalysis;
      setAnalysis(data);
      setSectionStates({});
      setChatMessages([]);
      setChatInput("");
      setAnalysisStatus(
        data.debug
          ? copy.ocrDone((data.debug.elapsedMs / 1000).toFixed(1))
          : copy.ocrDone(((performance.now() - startedAt) / 1000).toFixed(1)),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Something went wrong. Please try again.",
      );
      setAnalysisStatus("");
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleAnalyzeSection(section: SectionKey) {
    if (!analysis) {
      return;
    }

    setSectionStates((current) => ({
      ...current,
      [section]: {
        isLoading: true,
      },
    }));
    setError("");

    try {
      const response = await fetch("/api/analyze-section", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          analysis,
          section,
          explanationLanguage: analysis.explanationLanguage,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(errorData?.error ?? "Could not analyze this section.");
      }

      const result = (await response.json()) as {
        section: SectionKey;
        data: Partial<SentenceAnalysis>;
      };

      setAnalysis((current) =>
        current
          ? {
              ...current,
              ...result.data,
            }
          : current,
      );
      setSectionStates((current) => ({
        ...current,
        [section]: {
          isLoading: false,
        },
      }));
    } catch (requestError) {
      setSectionStates((current) => ({
        ...current,
        [section]: {
          isLoading: false,
          error:
            requestError instanceof Error
              ? requestError.message
              : "Something went wrong.",
        },
      }));
    }
  }

  async function handleSaveFavorite() {
    if (!analysis) {
      return;
    }

    setError("");
    setIsSavingFavorite(true);

    try {
      const response = await fetch(
        `/api/sentence-analyses/${analysis.id}/favorite`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ isFavorite: true }),
        },
      );

      if (!response.ok) {
        throw new Error("Could not save this analysis.");
      }

      const updated = (await response.json()) as { isFavorite: boolean };
      const nextFavorite = { ...analysis, isFavorite: updated.isFavorite };
      setAnalysis(nextFavorite);
      setFavorites((currentFavorites) => {
        const withoutDuplicate = currentFavorites.filter(
          (favorite) => favorite.id !== analysis.id,
        );
        return [nextFavorite, ...withoutDuplicate].slice(0, 5);
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setIsSavingFavorite(false);
    }
  }

  async function handleAskQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!analysis || !chatInput.trim()) {
      return;
    }

    const question = chatInput.trim();
    const nextMessages: ChatMessage[] = [
      ...chatMessages,
      {
        role: "user",
        content: question,
      },
    ];

    setChatMessages(nextMessages);
    setChatInput("");
    setIsChatLoading(true);
    setError("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          analysis,
          messages: nextMessages,
          explanationLanguage: analysis.explanationLanguage,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(errorData?.error ?? "The AI tutor could not answer.");
      }

      const data = (await response.json()) as { answer: string };
      setChatMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: data.answer,
        },
      ]);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setIsChatLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight">
                MistakePal
              </h1>
              <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                MVP
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Understand Duolingo sentences from screenshots.
            </p>
          </div>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <form className="space-y-5" onSubmit={handleAnalyze}>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">
                Explanation language
              </span>
              <select
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                value={explanationLanguage}
                onChange={(event) => setExplanationLanguage(event.target.value)}
              >
                {explanationLanguages.map((language) => (
                  <option key={language} value={language}>
                    {language}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">
                Duolingo screenshot
              </span>
              <input
                accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                className="w-full rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:bg-slate-100"
                type="file"
                onChange={handleImageChange}
              />
            </label>

            {previewUrl ? (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="Uploaded Duolingo screenshot preview"
                  className="max-h-96 w-full object-contain"
                  src={previewUrl}
                />
              </div>
            ) : null}

            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {analysisStatus ? (
              <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700">
                {analysisStatus}
              </div>
            ) : null}

            <button
              className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300 sm:w-auto"
              disabled={isAnalyzing}
              type="submit"
            >
              {isAnalyzing ? copy.readingButton : copy.analyzeButton}
            </button>
          </form>
        </section>

        {analysis ? (
          <>
            <OcrResultCard
              analysis={analysis}
              copy={copy}
              isSavingFavorite={isSavingFavorite}
              onSaveFavorite={handleSaveFavorite}
            />
            <LearningSectionsCard
              analysis={analysis}
              copy={copy}
              sectionStates={sectionStates}
              onAnalyzeSection={handleAnalyzeSection}
            />
            <ChatCard
              chatInput={chatInput}
              copy={copy}
              isChatLoading={isChatLoading}
              messages={chatMessages}
              onInputChange={setChatInput}
              onSubmit={handleAskQuestion}
            />
          </>
        ) : (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center shadow-sm">
            <p className="text-sm text-slate-600">
              {copy.empty}
            </p>
          </section>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold">{copy.favorites}</h2>
          {favorites.length > 0 ? (
            <div className="mt-4 space-y-3">
              {favorites.map((favorite) => (
                <article
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                  key={favorite.id}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-950">
                        {favorite.originalSentence}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {favorite.translatedSentence ??
                          favorite.originalTranslation}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-500 sm:justify-end">
                      <span>{favorite.sourceLanguage}</span>
                      <span>{favorite.explanationLanguage}</span>
                      <span>{formatDate(favorite.createdAt)}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">
              {copy.favoritesEmpty}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

function OcrResultCard({
  analysis,
  copy,
  isSavingFavorite,
  onSaveFavorite,
}: {
  analysis: SentenceAnalysis;
  copy: UiCopy;
  isSavingFavorite: boolean;
  onSaveFavorite: () => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">{copy.ocrResult}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {copy.ocrSubtitle(analysis.sourceLanguage)}
          </p>
        </div>
        <button
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
          disabled={analysis.isFavorite || isSavingFavorite}
          onClick={onSaveFavorite}
          type="button"
        >
          {analysis.isFavorite
            ? copy.saved
            : isSavingFavorite
              ? copy.saving
              : copy.save}
        </button>
      </div>

      <div className="mt-5 grid gap-4">
        <InfoBlock label={copy.originalSentence} value={analysis.originalSentence} />
        <InfoBlock
          label={copy.originalTranslation}
          value={analysis.originalTranslation}
        />
      </div>
    </section>
  );
}

function LearningSectionsCard({
  analysis,
  copy,
  sectionStates,
  onAnalyzeSection,
}: {
  analysis: SentenceAnalysis;
  copy: UiCopy;
  sectionStates: Partial<Record<SectionKey, SectionState>>;
  onAnalyzeSection: (section: SectionKey) => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <h2 className="text-lg font-semibold">{copy.learnOnDemand}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {copy.learnOnDemandSubtitle}
        </p>
      </div>

      <div className="mt-5 grid gap-3">
        {learningSections.map((section) => (
          <OnDemandSection
            analysis={analysis}
            copy={copy}
            key={section.key}
            section={section}
            state={sectionStates[section.key]}
            onAnalyzeSection={onAnalyzeSection}
          />
        ))}
      </div>
    </section>
  );
}

function OnDemandSection({
  analysis,
  copy,
  section,
  state,
  onAnalyzeSection,
}: {
  analysis: SentenceAnalysis;
  copy: UiCopy;
  section: {
    key: SectionKey;
  };
  state?: SectionState;
  onAnalyzeSection: (section: SectionKey) => void;
}) {
  const content = getSectionContent(analysis, section.key);
  const hasContent = content !== null;
  const sectionCopy = getSectionCopy(section.key, copy);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-950">
            {sectionCopy.title}
          </p>
          <p className="mt-1 text-sm text-slate-500">{sectionCopy.description}</p>
        </div>
        <button
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={state?.isLoading}
          onClick={() => onAnalyzeSection(section.key)}
          type="button"
        >
          {state?.isLoading
            ? copy.analyzingSection
            : hasContent
              ? copy.refreshSection
              : copy.analyzeSection}
        </button>
      </div>

      {state?.error ? (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </div>
      ) : null}

      {hasContent ? <div className="mt-4">{content}</div> : null}
    </div>
  );
}

function getSectionContent(analysis: SentenceAnalysis, section: SectionKey) {
  if (section === "translation" && analysis.translatedSentence) {
    return <InfoBlock label="Translation" value={analysis.translatedSentence} />;
  }

  if (section === "breakdown" && analysis.sentenceBreakdown?.length) {
    return (
      <ListBlock
        items={analysis.sentenceBreakdown}
        renderItem={(item) => (
          <>
            <span className="font-medium text-slate-950">{item.part}</span>
            <span className="text-slate-600"> = {item.explanation}</span>
          </>
        )}
      />
    );
  }

  if (section === "vocabulary" && analysis.vocabulary?.length) {
    return (
      <ListBlock
        items={analysis.vocabulary}
        renderItem={(item) => (
          <>
            <span className="font-medium text-slate-950">{item.word}</span>
            <span className="text-slate-600">: {item.meaning}</span>
            {item.note ? (
              <span className="text-slate-500"> ({item.note})</span>
            ) : null}
          </>
        )}
      />
    );
  }

  if (section === "grammar" && analysis.grammarPoints?.length) {
    return (
      <ListBlock
        items={analysis.grammarPoints}
        renderItem={(item) => (
          <>
            <span className="font-medium text-slate-950">{item.title}</span>
            <span className="text-slate-600">: {item.explanation}</span>
          </>
        )}
      />
    );
  }

  if (section === "examples" && analysis.similarExamples?.length) {
    return (
      <ListBlock
        items={analysis.similarExamples}
        renderItem={(item) => (
          <>
            <span className="font-medium text-slate-950">{item.sentence}</span>
            <span className="text-slate-600"> = {item.translation}</span>
          </>
        )}
      />
    );
  }

  if (section === "tip" && analysis.learnerTip) {
    return <InfoBlock label="Learner tip" value={analysis.learnerTip} />;
  }

  return null;
}

function ChatCard({
  chatInput,
  copy,
  isChatLoading,
  messages,
  onInputChange,
  onSubmit,
}: {
  chatInput: string;
  copy: UiCopy;
  isChatLoading: boolean;
  messages: ChatMessage[];
  onInputChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <h2 className="text-lg font-semibold">{copy.askTitle}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {copy.askSubtitle}
        </p>
      </div>

      <div className="mt-4 space-y-3">
        {messages.length > 0 ? (
          messages.map((message, index) => (
            <div
              className={`rounded-xl border p-3 text-sm leading-6 ${
                message.role === "user"
                  ? "ml-auto border-blue-100 bg-blue-50 text-blue-950"
                  : "mr-auto border-slate-200 bg-slate-50 text-slate-900"
              } max-w-[92%] whitespace-pre-wrap`}
              key={`${message.role}-${index}`}
            >
              {message.content}
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
            {copy.askEmpty}
          </div>
        )}

        {isChatLoading ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
            {copy.answering}
          </div>
        ) : null}
      </div>

      <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={onSubmit}>
        <input
          className="min-h-11 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          disabled={isChatLoading}
          placeholder={copy.askPlaceholder}
          value={chatInput}
          onChange={(event) => onInputChange(event.target.value)}
        />
        <button
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={isChatLoading || !chatInput.trim()}
          type="submit"
        >
          {copy.askButton}
        </button>
      </form>
    </section>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-medium text-slate-700">{label}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-950">
        {value}
      </p>
    </div>
  );
}

function ListBlock<T>({
  items,
  renderItem,
}: {
  items: T[];
  renderItem: (item: T) => ReactNode;
}) {
  return (
    <ul className="list-inside list-disc space-y-1 text-sm leading-6">
      {items.map((item, index) => (
        <li key={index}>{renderItem(item)}</li>
      ))}
    </ul>
  );
}

function getSectionCopy(section: SectionKey, copy: UiCopy) {
  const labels: Record<
    string,
    Record<SectionKey, { title: string; description: string }>
  > = {
    Chinese: {
      breakdown: {
        title: "句子拆解",
        description: "把句子拆成更容易理解的小块。",
      },
      vocabulary: {
        title: "重点词汇",
        description: "学习这个句子里最值得记住的词。",
      },
      grammar: {
        title: "语法点",
        description: "解释这个句子里值得注意的语法结构。",
      },
      examples: {
        title: "相似例句",
        description: "生成相似句子，帮助你迁移练习。",
      },
      tip: {
        title: "学习提示",
        description: "获得一个简短的复习建议。",
      },
      translation: {
        title: "翻译",
        description: "翻译成你的解释语言。",
      },
    },
    English: {
      breakdown: {
        title: "Sentence breakdown",
        description: "Break the sentence into understandable chunks.",
      },
      vocabulary: {
        title: "Key vocabulary",
        description: "Study the important words in this sentence.",
      },
      grammar: {
        title: "Grammar points",
        description: "Explain the grammar patterns worth noticing.",
      },
      examples: {
        title: "Similar examples",
        description: "Generate similar sentences for practice.",
      },
      tip: {
        title: "Learner tip",
        description: "Get one compact review tip for this sentence.",
      },
      translation: {
        title: "Translation",
        description: "Translate the sentence into your explanation language.",
      },
    },
    Japanese: {
      breakdown: { title: "文の分解", description: "文を理解しやすい単位に分けます。" },
      vocabulary: { title: "重要語彙", description: "この文で大事な単語を学びます。" },
      grammar: { title: "文法ポイント", description: "注目すべき文法を説明します。" },
      examples: { title: "似た例文", description: "練習用の似た文を作ります。" },
      tip: { title: "学習のヒント", description: "短い復習アドバイスを表示します。" },
      translation: { title: "翻訳", description: "選択した説明言語に翻訳します。" },
    },
    Korean: {
      breakdown: { title: "문장 분석", description: "문장을 이해하기 쉬운 단위로 나눕니다." },
      vocabulary: { title: "핵심 어휘", description: "이 문장에서 중요한 단어를 학습합니다." },
      grammar: { title: "문법 포인트", description: "주목할 만한 문법 구조를 설명합니다." },
      examples: { title: "비슷한 예문", description: "연습용 비슷한 문장을 생성합니다." },
      tip: { title: "학습 팁", description: "짧은 복습 팁을 제공합니다." },
      translation: { title: "번역", description: "선택한 설명 언어로 번역합니다." },
    },
    Spanish: {
      breakdown: { title: "Desglose de la oración", description: "Divide la oración en partes fáciles de entender." },
      vocabulary: { title: "Vocabulario clave", description: "Estudia las palabras importantes de esta oración." },
      grammar: { title: "Puntos gramaticales", description: "Explica las estructuras gramaticales relevantes." },
      examples: { title: "Ejemplos similares", description: "Genera oraciones similares para practicar." },
      tip: { title: "Consejo de estudio", description: "Muestra un consejo breve de repaso." },
      translation: { title: "Traducción", description: "Traduce a tu idioma de explicación." },
    },
    French: {
      breakdown: { title: "Découpage de la phrase", description: "Découpe la phrase en blocs faciles à comprendre." },
      vocabulary: { title: "Vocabulaire clé", description: "Étudie les mots importants de cette phrase." },
      grammar: { title: "Points de grammaire", description: "Explique les structures grammaticales importantes." },
      examples: { title: "Exemples similaires", description: "Génère des phrases similaires pour t'entraîner." },
      tip: { title: "Conseil d'apprentissage", description: "Affiche un court conseil de révision." },
      translation: { title: "Traduction", description: "Traduis dans ta langue d'explication." },
    },
  };

  return labels[copy.language]?.[section] ?? labels.English[section];
}

function getUiCopy(language: string): UiCopy {
  const copies: Record<string, UiCopy> = {
    Chinese: {
      language: "Chinese",
      analyzing: "正在扫描截图...",
      analyzeButton: "分析截图",
      readingButton: "正在读取截图...",
      ocrDone: (seconds) => `OCR 已完成，用时 ${seconds} 秒。`,
      empty: "上传 Duolingo 截图，开始第一次句子识别。",
      ocrResult: "OCR 识别结果",
      ocrSubtitle: (language) => `已在截图中识别到 ${language} 句子`,
      originalSentence: "原句",
      originalTranslation: "截图中的英文翻译",
      learnOnDemand: "按需学习",
      learnOnDemandSubtitle: "只打开你现在想学习的部分。",
      analyzeSection: "分析",
      refreshSection: "重新分析",
      analyzingSection: "分析中...",
      askTitle: "围绕这个句子提问",
      askSubtitle: "趁印象还新，问一个追问。",
      askPlaceholder: "输入你关于这个句子的问题...",
      askButton: "问 AI",
      answering: "Gemini 正在回答...",
      askEmpty: "可以问某个词为什么变形、这个短语怎么用，或者要更多例句。",
      save: "收藏",
      saved: "已收藏",
      saving: "保存中...",
      favorites: "收藏",
      favoritesEmpty: "收藏的分析会显示在这里。",
    },
    English: {
      language: "English",
      analyzing: "Reading screenshot with OCR...",
      analyzeButton: "Analyze Screenshot",
      readingButton: "Reading screenshot...",
      ocrDone: (seconds) => `OCR completed in ${seconds}s.`,
      empty: "Upload a Duolingo screenshot to get your first OCR result.",
      ocrResult: "OCR result",
      ocrSubtitle: (language) => `${language} sentence found in the screenshot`,
      originalSentence: "Original sentence",
      originalTranslation: "English translation from screenshot",
      learnOnDemand: "Learn on demand",
      learnOnDemandSubtitle: "Open only the parts you want to study right now.",
      analyzeSection: "Analyze",
      refreshSection: "Refresh",
      analyzingSection: "Analyzing...",
      askTitle: "Ask about this sentence",
      askSubtitle: "Ask a follow-up question while the sentence is fresh.",
      askPlaceholder: "Ask a question about this sentence...",
      askButton: "Ask AI",
      answering: "Gemini is answering...",
      askEmpty: "Try asking why a word changes form, how to use the phrase, or for more examples.",
      save: "Save to Favorites",
      saved: "Saved to Favorites",
      saving: "Saving...",
      favorites: "Favorites",
      favoritesEmpty: "Saved analyses will appear here.",
    },
  };

  return copies[language] ?? copies.English;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
