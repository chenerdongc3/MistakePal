"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { AuthCard } from "../components/auth-card";
import { ChatCard } from "../components/chat-card";
import { FavoritesList } from "../components/favorites-list";
import { LearningSectionsCard } from "../components/learning-sections-card";
import { OcrResultCard } from "../components/ocr-result-card";
import { UserSettingsPanel } from "../components/user-settings-panel";
import { createBrowserSupabaseClient, getAccessToken } from "../lib/client/supabase";
import type {
  ChatMessage,
  PersonalAgentConfig,
  SectionKey,
  SectionState,
  SentenceAnalysis,
  SubscriptionPlan,
} from "../lib/types";
import { explanationLanguages, getUiCopy } from "../lib/ui-copy";

type AuthMode = "sign-in" | "sign-up";
type ActiveView = "learn" | "settings";
const agentConfigStorageKey = "mistakepal-agent-config";
const planStorageKey = "mistakepal-plan";
const maxScreenshotSizeBytes = 8 * 1024 * 1024;
const allowedScreenshotTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);
const defaultAgentConfig: PersonalAgentConfig = {
  mode: "platform",
  provider: "gemini",
  region: "global",
  apiKey: "",
  baseUrl: "https://api.openai.com/v1",
  model: "gemini-2.5-flash",
};

export default function Home() {
  const resultRef = useRef<HTMLDivElement | null>(null);
  const [supabaseClient] = useState<SupabaseClient | null>(() =>
    createBrowserSupabaseClient(),
  );
  const [user, setUser] = useState<User | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMode, setAuthMode] = useState<AuthMode>("sign-in");
  const [authStatus, setAuthStatus] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(true);
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
  const [deletingFavoriteId, setDeletingFavoriteId] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [error, setError] = useState("");
  const [analysisStatus, setAnalysisStatus] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [agentConfig, setAgentConfig] =
    useState<PersonalAgentConfig>(defaultAgentConfig);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>("free");
  const [activeView, setActiveView] = useState<ActiveView>("learn");
  const copy = getUiCopy(explanationLanguage);
  const billingUrl = process.env.NEXT_PUBLIC_BILLING_URL ?? "";

  useEffect(() => {
    const storedConfig = window.localStorage.getItem(agentConfigStorageKey);
    const storedPlan = window.localStorage.getItem(planStorageKey);

    if (isSubscriptionPlan(storedPlan)) {
      setSelectedPlan(storedPlan);
    }

    if (storedConfig) {
      try {
        setAgentConfig({
          ...defaultAgentConfig,
          ...(JSON.parse(storedConfig) as Partial<PersonalAgentConfig>),
        });
      } catch {
        window.localStorage.removeItem(agentConfigStorageKey);
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(agentConfigStorageKey, JSON.stringify(agentConfig));
  }, [agentConfig]);

  useEffect(() => {
    window.localStorage.setItem(planStorageKey, selectedPlan);
  }, [selectedPlan]);

  useEffect(() => {
    if (!supabaseClient) {
      setIsAuthLoading(false);
      return;
    }

    supabaseClient.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setIsAuthLoading(false);
    });

    const { data: listener } = supabaseClient.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      },
    );

    return () => listener.subscription.unsubscribe();
  }, [supabaseClient]);

  useEffect(() => {
    if (user) {
      fetchFavorites();
    } else {
      setFavorites([]);
    }
  }, [user]);

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
    const nextImage = event.target.files?.[0] ?? null;

    if (nextImage) {
      const validationError = validateScreenshot(nextImage);

      if (validationError) {
        event.target.value = "";
        setImage(null);
        resetCurrentAnalysis();
        setError(validationError);
        return;
      }
    }

    setImage(nextImage);
    resetCurrentAnalysis();
  }

  function resetCurrentAnalysis() {
    setAnalysis(null);
    setSectionStates({});
    setAnalysisStatus("");
    setChatInput("");
    setChatMessages([]);
    setError("");
  }

  function validateScreenshot(file: File) {
    if (!allowedScreenshotTypes.has(file.type)) {
      return "Please upload a PNG, JPG, JPEG, or WEBP screenshot.";
    }

    if (file.size > maxScreenshotSizeBytes) {
      return "Screenshot is too large. Please upload an image under 8MB.";
    }

    return "";
  }

  function getUserFacingErrorMessage(
    errorValue: unknown,
    context: "ocr" | "favorite" | "save" | "chat",
  ) {
    const message =
      errorValue instanceof Error ? errorValue.message : String(errorValue ?? "");

    if (message.toLowerCase().includes("login") || message.includes("401")) {
      return "Your login session expired. Please sign in again.";
    }

    if (
      message.toLowerCase().includes("missing gemini") ||
      message.toLowerCase().includes("api key")
    ) {
      return "AI is not configured. Add an API key in Settings or configure the server key.";
    }

    if (
      message.toLowerCase().includes("too many") ||
      message.toLowerCase().includes("rate")
    ) {
      return "You are making requests too quickly. Please wait a moment and try again.";
    }

    if (
      message.toLowerCase().includes("read the screenshot") ||
      message.toLowerCase().includes("ocr") ||
      context === "ocr"
    ) {
      return "The screenshot could not be read. Please upload a clearer Duolingo screenshot.";
    }

    if (context === "favorite") {
      return "Favorite could not be saved. Please check your login and try again.";
    }

    if (context === "chat") {
      return "AI tutor is temporarily unavailable. Please try again in a moment.";
    }

    if (context === "save") {
      return "Changes could not be saved. Please try again.";
    }

    return "Something went wrong. Please try again.";
  }

  async function fetchFavorites() {
    const accessToken = await getAccessToken(supabaseClient);

    if (!accessToken) {
      setFavorites([]);
      return;
    }

    try {
      const response = await fetch("/api/favorites", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Could not load favorites.");
      }

      const data = (await response.json()) as SentenceAnalysis[];
      setFavorites(data.slice(0, 5));
    } catch {
      setFavorites([]);
    }
  }

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setAuthStatus("");

    if (!supabaseClient) {
      setError("Missing Supabase public configuration.");
      return;
    }

    setIsAuthLoading(true);

    try {
      const authCall =
        authMode === "sign-in"
          ? supabaseClient.auth.signInWithPassword({
              email: authEmail,
              password: authPassword,
            })
          : supabaseClient.auth.signUp({
              email: authEmail,
              password: authPassword,
            });

      const { data, error: authError } = await authCall;

      if (authError) {
        throw authError;
      }

      if (data.session?.user) {
        setUser(data.user);
      }

      if (authMode === "sign-up") {
        if (data.session) {
          setAuthStatus("Account created and signed in.");
        } else {
          setAuthMode("sign-in");
          setAuthPassword("");
          setAuthStatus(
            "Account created. Please check your email if confirmation is required, then sign in.",
          );
        }
      } else {
        setAuthStatus("Signed in.");
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Authentication failed.",
      );
    } finally {
      setIsAuthLoading(false);
    }
  }

  async function handleSignOut() {
    if (!supabaseClient) {
      return;
    }

    await supabaseClient.auth.signOut();
    setUser(null);
    setAnalysis(null);
    setFavorites([]);
    setChatMessages([]);
    setAuthStatus("");
    setActiveView("learn");
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
      const accessToken = await getAccessToken(supabaseClient);
      const response = await fetch("/api/analyze-screenshot", {
        method: "POST",
        headers: accessToken
          ? {
              Authorization: `Bearer ${accessToken}`,
            }
          : undefined,
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
      const persisted = await persistAnalysis(data, {
        includeImage: true,
        sourceImage: image,
      }).catch((persistError) => {
        setError(getUserFacingErrorMessage(persistError, "save"));
        return null;
      });
      setAnalysis(persisted ?? data);
      setSectionStates({});
      setChatMessages([]);
      setChatInput("");
      setAnalysisStatus(
        data.debug
          ? copy.ocrDone((data.debug.elapsedMs / 1000).toFixed(1))
          : copy.ocrDone(((performance.now() - startedAt) / 1000).toFixed(1)),
      );
    } catch (requestError) {
      setError(getUserFacingErrorMessage(requestError, "ocr"));
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
      const nextAnalysis = {
        ...analysis,
        ...result.data,
      };

      setAnalysis(nextAnalysis);
      persistAnalysis(nextAnalysis).catch((persistError) => {
        console.warn("[analysis] Could not persist section result:", persistError);
      });
      setFavorites((currentFavorites) =>
        currentFavorites.map((favorite) =>
          favorite.id === nextAnalysis.id ? nextAnalysis : favorite,
        ),
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
              : "AI service failed. Please try again.",
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
      const accessToken = await getAccessToken(supabaseClient);

      if (!accessToken) {
        throw new Error("Please sign in before saving favorites.");
      }

      const favoriteBody = buildFavoriteRequestBody(analysis);
      const response = await fetch(
        `/api/sentence-analyses/${analysis.id}/favorite`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            ...(favoriteBody instanceof FormData
              ? {}
              : { "Content-Type": "application/json" }),
          },
          body:
            favoriteBody instanceof FormData
              ? favoriteBody
              : JSON.stringify(favoriteBody),
        },
      );

      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(errorData?.error ?? "Could not save this analysis.");
      }

      const updated = (await response.json()) as {
        createdAt?: string;
        imageUrl?: string;
        isFavorite: boolean;
        updatedAt?: string;
      };
      const nextFavorite = {
        ...analysis,
        createdAt: updated.createdAt ?? analysis.createdAt,
        imageUrl: updated.imageUrl ?? analysis.imageUrl,
        isFavorite: updated.isFavorite,
        updatedAt: updated.updatedAt ?? analysis.updatedAt,
      };
      setAnalysis(nextFavorite);
      setFavorites((currentFavorites) => {
        const withoutDuplicate = currentFavorites.filter(
          (favorite) => favorite.id !== analysis.id,
        );
        return [nextFavorite, ...withoutDuplicate].slice(0, 5);
      });
    } catch (requestError) {
      setError(
        getUserFacingErrorMessage(requestError, "favorite"),
      );
    } finally {
      setIsSavingFavorite(false);
    }
  }

  async function handleDeleteFavorite(id: string) {
    setError("");
    setDeletingFavoriteId(id);

    try {
      const accessToken = await getAccessToken(supabaseClient);

      if (!accessToken) {
        throw new Error("Please sign in before deleting favorites.");
      }

      const response = await fetch(`/api/sentence-analyses/${id}/favorite`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(errorData?.error ?? "Could not delete this favorite.");
      }

      setFavorites((currentFavorites) =>
        currentFavorites.filter((favorite) => favorite.id !== id),
      );
      setAnalysis((current) =>
        current?.id === id ? { ...current, isFavorite: false } : current,
      );
    } catch (requestError) {
      setError(
        getUserFacingErrorMessage(requestError, "favorite"),
      );
    } finally {
      setDeletingFavoriteId("");
    }
  }

  async function persistFavorite(nextAnalysis: SentenceAnalysis) {
    const accessToken = await getAccessToken(supabaseClient);

    if (!accessToken) {
      return;
    }

    await fetch(`/api/sentence-analyses/${nextAnalysis.id}/favorite`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildAnalysisPayload(nextAnalysis)),
    });
  }

  async function persistAnalysis(
    nextAnalysis: SentenceAnalysis,
    options?: {
      includeImage?: boolean;
      sourceImage?: File | null;
    },
  ) {
    const accessToken = await getAccessToken(supabaseClient);

    if (!accessToken) {
      return null;
    }

    const requestBody = buildAnalysisRequestBody(nextAnalysis, options);
    const response = await fetch(`/api/sentence-analyses/${nextAnalysis.id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(requestBody instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
      },
      body:
        requestBody instanceof FormData
          ? requestBody
          : JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      throw new Error(errorData?.error ?? "Could not save this analysis.");
    }

    const updated = (await response.json()) as {
      createdAt?: string;
      imageUrl?: string;
      isFavorite?: boolean;
      updatedAt?: string;
    };

    return {
      ...nextAnalysis,
      createdAt: updated.createdAt ?? nextAnalysis.createdAt,
      imageUrl: updated.imageUrl ?? nextAnalysis.imageUrl,
      isFavorite: updated.isFavorite ?? nextAnalysis.isFavorite,
      updatedAt: updated.updatedAt ?? nextAnalysis.updatedAt,
    };
  }

  function buildAnalysisPayload(nextAnalysis: SentenceAnalysis) {
    return {
      isFavorite: nextAnalysis.isFavorite,
      imageUrl: getPersistentImageUrl(nextAnalysis.imageUrl),
      sourceLanguage: nextAnalysis.sourceLanguage,
      explanationLanguage: nextAnalysis.explanationLanguage,
      originalSentence: nextAnalysis.originalSentence,
      originalTranslation: nextAnalysis.originalTranslation,
      translatedSentence: nextAnalysis.translatedSentence,
      sentenceBreakdown: nextAnalysis.sentenceBreakdown ?? [],
      vocabulary: nextAnalysis.vocabulary ?? [],
      grammarPoints: nextAnalysis.grammarPoints ?? [],
      similarExamples: nextAnalysis.similarExamples ?? [],
      learnerTip: nextAnalysis.learnerTip,
      chatMessages: nextAnalysis.chatMessages ?? chatMessages,
    };
  }

  function buildFavoriteRequestBody(nextAnalysis: SentenceAnalysis) {
    const payload = {
      ...buildAnalysisPayload(nextAnalysis),
      isFavorite: true,
    };

    if (payload.imageUrl || !image) {
      return payload;
    }

    const formData = new FormData();
    formData.append("image", image);
    formData.append("isFavorite", String(payload.isFavorite));
    formData.append("imageUrl", payload.imageUrl);
    formData.append("sourceLanguage", payload.sourceLanguage);
    formData.append("explanationLanguage", payload.explanationLanguage);
    formData.append("originalSentence", payload.originalSentence);
    formData.append("originalTranslation", payload.originalTranslation);
    formData.append("translatedSentence", payload.translatedSentence ?? "");
    formData.append(
      "sentenceBreakdown",
      JSON.stringify(payload.sentenceBreakdown),
    );
    formData.append("vocabulary", JSON.stringify(payload.vocabulary));
    formData.append("grammarPoints", JSON.stringify(payload.grammarPoints));
    formData.append(
      "similarExamples",
      JSON.stringify(payload.similarExamples),
    );
    formData.append("learnerTip", payload.learnerTip ?? "");
    formData.append("chatMessages", JSON.stringify(payload.chatMessages));

    return formData;
  }

  function buildAnalysisRequestBody(
    nextAnalysis: SentenceAnalysis,
    options?: {
      includeImage?: boolean;
      sourceImage?: File | null;
    },
  ) {
    const payload = buildAnalysisPayload(nextAnalysis);
    const sourceImage = options?.sourceImage ?? image;

    if (payload.imageUrl || !options?.includeImage || !sourceImage) {
      return payload;
    }

    const formData = new FormData();
    formData.append("image", sourceImage);
    formData.append("isFavorite", String(payload.isFavorite));
    formData.append("imageUrl", payload.imageUrl);
    formData.append("sourceLanguage", payload.sourceLanguage);
    formData.append("explanationLanguage", payload.explanationLanguage);
    formData.append("originalSentence", payload.originalSentence);
    formData.append("originalTranslation", payload.originalTranslation);
    formData.append("translatedSentence", payload.translatedSentence ?? "");
    formData.append(
      "sentenceBreakdown",
      JSON.stringify(payload.sentenceBreakdown),
    );
    formData.append("vocabulary", JSON.stringify(payload.vocabulary));
    formData.append("grammarPoints", JSON.stringify(payload.grammarPoints));
    formData.append(
      "similarExamples",
      JSON.stringify(payload.similarExamples),
    );
    formData.append("learnerTip", payload.learnerTip ?? "");
    formData.append("chatMessages", JSON.stringify(payload.chatMessages));

    return formData;
  }

  function getPersistentImageUrl(value: string) {
    if (
      !value ||
      value.startsWith("blob:") ||
      value.startsWith("file:") ||
      value.startsWith("/mock-uploads/")
    ) {
      return "";
    }

    return value;
  }

  function isSubscriptionPlan(value: string | null): value is SubscriptionPlan {
    return value === "free" || value === "plus" || value === "pro";
  }

  function handleSelectFavorite(favorite: SentenceAnalysis) {
    setImage(null);
    setPreviewUrl("");
    setAnalysis(favorite);
    setExplanationLanguage(favorite.explanationLanguage || "Chinese");
    setSectionStates({});
    setAnalysisStatus("");
    setChatInput("");
    setChatMessages(favorite.chatMessages ?? []);
    setError("");

    window.setTimeout(() => {
      resultRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  }

  function handleUpdateOcr(nextValues: {
    originalSentence: string;
    originalTranslation: string;
  }) {
    if (!analysis) {
      return;
    }

    const nextAnalysis: SentenceAnalysis = {
      ...analysis,
      originalSentence: nextValues.originalSentence,
      originalTranslation: nextValues.originalTranslation,
      translatedSentence: undefined,
      sentenceBreakdown: [],
      vocabulary: [],
      grammarPoints: [],
      similarExamples: [],
      learnerTip: undefined,
    };

    setAnalysis(nextAnalysis);
    setFavorites((currentFavorites) =>
      currentFavorites.map((favorite) =>
        favorite.id === nextAnalysis.id ? nextAnalysis : favorite,
      ),
    );
    setSectionStates({});
    persistAnalysis(nextAnalysis).catch((persistError) => {
      setError(getUserFacingErrorMessage(persistError, "save"));
    });
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
          agentConfig,
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

      const data = (await response.json()) as Pick<
        ChatMessage,
        "content" | "toolEvents"
      > & { answer: string };
      const nextChatMessages: ChatMessage[] = [
        ...nextMessages,
        {
          role: "assistant",
          content: data.answer,
          toolEvents: data.toolEvents,
        },
      ];
      setChatMessages(nextChatMessages);
      if (analysis.isFavorite) {
        setFavorites((currentFavorites) =>
          currentFavorites.map((favorite) =>
            favorite.id === analysis.id
              ? { ...analysis, chatMessages: nextChatMessages }
              : favorite,
          ),
        );
      }
      persistAnalysis({
        ...analysis,
        chatMessages: nextChatMessages,
      }).catch((persistError) => {
        console.warn("[analysis] Could not persist chat messages:", persistError);
      });
    } catch (requestError) {
      setError(
        getUserFacingErrorMessage(requestError, "chat"),
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
          {user ? (
            <div className="flex flex-col gap-2 text-sm text-slate-600 sm:items-end">
              <span>{user.email}</span>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <button
                  className={`w-fit rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    activeView === "settings"
                      ? "border-blue-200 bg-blue-50 text-blue-700"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                  onClick={() =>
                    setActiveView((current) =>
                      current === "settings" ? "learn" : "settings",
                    )
                  }
                  type="button"
                >
                  我的
                </button>
                <button
                  className="w-fit rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  onClick={handleSignOut}
                  type="button"
                >
                  Sign out
                </button>
              </div>
            </div>
          ) : null}
        </header>

        {!user ? (
          <AuthCard
            authEmail={authEmail}
            authMode={authMode}
            authPassword={authPassword}
            authStatus={authStatus}
            error={error}
            isAuthLoading={isAuthLoading}
            isConfigured={Boolean(supabaseClient)}
            onEmailChange={setAuthEmail}
            onModeChange={setAuthMode}
            onPasswordChange={setAuthPassword}
            onSubmit={handleAuth}
          />
        ) : activeView === "settings" ? (
          <UserSettingsPanel
            agentConfig={agentConfig}
            billingUrl={billingUrl}
            plan={selectedPlan}
            onAgentConfigChange={setAgentConfig}
            onBack={() => setActiveView("learn")}
            onPlanChange={setSelectedPlan}
          />
        ) : (
          <>
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <form className="space-y-5" onSubmit={handleAnalyze}>
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-700">
                    Explanation language
                  </span>
                  <select
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    value={explanationLanguage}
                    onChange={(event) =>
                      setExplanationLanguage(event.target.value)
                    }
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
                  <span className="block text-xs leading-5 text-slate-500">
                    PNG, JPG, JPEG, or WEBP. Maximum 8MB. Use a clear screenshot
                    with the target sentence and English translation visible.
                  </span>
                </label>

                <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 sm:grid-cols-3">
                  <span>1. Read screenshot</span>
                  <span>2. Extract sentence</span>
                  <span>3. Learn grammar, words, examples</span>
                </div>

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
              <div className="flex flex-col gap-6" ref={resultRef}>
                <OcrResultCard
                  analysis={analysis}
                  copy={copy}
                  isSavingFavorite={isSavingFavorite}
                  onUpdateOcr={handleUpdateOcr}
                  onSaveFavorite={handleSaveFavorite}
                />
                <LearningSectionsCard
                  analysis={analysis}
                  copy={copy}
                  sectionStates={sectionStates}
                  onAnalyzeSection={handleAnalyzeSection}
                />
                <ChatCard
                  contextSentence={analysis.originalSentence}
                  chatInput={chatInput}
                  copy={copy}
                  isChatLoading={isChatLoading}
                  messages={chatMessages}
                  onInputChange={setChatInput}
                  onSubmit={handleAskQuestion}
                />
              </div>
            ) : (
              <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center shadow-sm">
                <p className="text-sm text-slate-600">{copy.empty}</p>
              </section>
            )}

            <FavoritesList
              copy={copy}
              deletingFavoriteId={deletingFavoriteId}
              favorites={favorites}
              onDeleteFavorite={handleDeleteFavorite}
              onSelectFavorite={handleSelectFavorite}
            />
          </>
        )}
      </div>
    </main>
  );
}
