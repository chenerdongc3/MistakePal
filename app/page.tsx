"use client";

import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { AuthCard } from "../components/auth-card";
import { BatchProgressCard } from "../components/batch-progress-card";
import { BatchReviewActions } from "../components/batch-review-actions";
import { ChatCard } from "../components/chat-card";
import { FavoritesList } from "../components/favorites-list";
import { LearningSectionsCard } from "../components/learning-sections-card";
import { MultiImageUploadCard } from "../components/multi-image-upload-card";
import { OcrResultCard } from "../components/ocr-result-card";
import { RecentAnalysesList } from "../components/recent-analyses-list";
import { UserSettingsPanel } from "../components/user-settings-panel";
import { Alert } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { createBrowserSupabaseClient, getAccessToken } from "../lib/client/supabase";
import type {
  BatchUploadItem,
  BillingProfile,
  ChatMessage,
  PersonalAgentConfig,
  SectionKey,
  SectionState,
  SentenceAnalysis,
  SubscriptionPlan,
} from "../lib/types";
import { explanationLanguages, getUiCopy } from "../lib/ui-copy";

type AuthMode = "sign-in" | "sign-up";
type ActiveView = "learn" | "favorites" | "settings";
const agentConfigStorageKey = "mistakepal-agent-config";
const agentConfigMetadataKey = "mistakepalAgentConfig";
const planStorageKey = "mistakepal-plan";
const maxScreenshotSizeBytes = 8 * 1024 * 1024;
const maxBatchImageCount = 10;
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
  const uploadQueueRef = useRef<BatchUploadItem[]>([]);
  const pathname = usePathname();
  const router = useRouter();
  const [supabaseClient] = useState<SupabaseClient | null>(() =>
    createBrowserSupabaseClient(),
  );
  const [user, setUser] = useState<User | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authVerificationCode, setAuthVerificationCode] = useState("");
  const [isVerificationPending, setIsVerificationPending] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("sign-in");
  const [authStatus, setAuthStatus] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [image, setImage] = useState<File | null>(null);
  const [uploadQueue, setUploadQueue] = useState<BatchUploadItem[]>([]);
  const [activeQueueItemId, setActiveQueueItemId] = useState("");
  const [batchStatus, setBatchStatus] = useState("");
  const [explanationLanguage, setExplanationLanguage] = useState("Chinese");
  const [analysis, setAnalysis] = useState<SentenceAnalysis | null>(null);
  const [recentAnalyses, setRecentAnalyses] = useState<SentenceAnalysis[]>([]);
  const [favorites, setFavorites] = useState<SentenceAnalysis[]>([]);
  const [sectionStates, setSectionStates] = useState<
    Partial<Record<SectionKey, SectionState>>
  >({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSavingFavorite, setIsSavingFavorite] = useState(false);
  const [checkoutLoadingPlan, setCheckoutLoadingPlan] = useState<
    Exclude<SubscriptionPlan, "free"> | ""
  >("");
  const [deletingFavoriteId, setDeletingFavoriteId] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [error, setError] = useState("");
  const [billingError, setBillingError] = useState("");
  const [billingStatus, setBillingStatus] = useState("");
  const [analysisStatus, setAnalysisStatus] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [agentConfig, setAgentConfig] =
    useState<PersonalAgentConfig>(defaultAgentConfig);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>("free");
  const [billingProfile, setBillingProfile] = useState<BillingProfile | null>(
    null,
  );
  const copy = getUiCopy(explanationLanguage);
  const billingUrl = process.env.NEXT_PUBLIC_BILLING_URL ?? "";
  const activeView: ActiveView =
    pathname === "/settings"
      ? "settings"
      : pathname === "/favorites"
        ? "favorites"
        : "learn";

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
    if (!user) {
      return;
    }

    const metadataConfig = parsePersonalAgentConfig(
      user.app_metadata?.[agentConfigMetadataKey],
    );

    if (!metadataConfig) {
      return;
    }

    const storedConfig = parsePersonalAgentConfig(
      window.localStorage.getItem(agentConfigStorageKey),
    );

    if (storedConfig?.mode === "personal" && storedConfig.apiKey) {
      return;
    }

    setAgentConfig({
      ...defaultAgentConfig,
      ...metadataConfig,
    });
  }, [user]);

  useEffect(() => {
    window.localStorage.setItem(planStorageKey, selectedPlan);
  }, [selectedPlan]);

  useEffect(() => {
    if (pathname === "/") {
      router.replace("/learn");
      return;
    }

    const searchParams = new URLSearchParams(window.location.search);

    if (searchParams.get("billing") === "success") {
      setBillingStatus("Payment completed. Your subscription will update shortly.");
      window.history.replaceState(null, "", "/settings");
    }
  }, [pathname, router]);

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
      fetchRecentAnalyses();
      fetchFavorites();
      fetchBillingProfile();
    } else {
      setRecentAnalyses([]);
      setFavorites([]);
      setBillingProfile(null);
    }
  }, [user]);

  useEffect(() => {
    uploadQueueRef.current = uploadQueue;
  }, [uploadQueue]);

  useEffect(() => {
    return () => {
      uploadQueueRef.current.forEach((item) =>
        URL.revokeObjectURL(item.previewUrl),
      );
    };
  }, []);

  function handleImagesSelected(files: File[]) {
    const nextItems: BatchUploadItem[] = [];
    const validationErrors: string[] = [];
    const acceptedFiles = files.slice(0, maxBatchImageCount);

    if (files.length > maxBatchImageCount) {
      validationErrors.push(
        `Only the first ${maxBatchImageCount} screenshots were added.`,
      );
    }

    acceptedFiles.forEach((file) => {
      const validationError = validateScreenshot(file);
      if (validationError) {
        validationErrors.push(`${file.name}: ${validationError}`);
        return;
      }

      nextItems.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        status: "pending",
      });
    });

    if (nextItems.length === 0) {
      setError(validationErrors[0] ?? "Please upload at least one screenshot.");
      return;
    }

    replaceUploadQueue(nextItems);
    setActiveQueueItemId("");
    setBatchStatus("");
    setImage(null);
    resetCurrentAnalysis();
    setError(validationErrors.join(" "));
  }

  function replaceUploadQueue(nextQueue: BatchUploadItem[]) {
    setUploadQueue((currentQueue) => {
      currentQueue.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      return nextQueue;
    });
  }

  function updateQueueItem(
    id: string,
    updates: Partial<Omit<BatchUploadItem, "id" | "file" | "previewUrl">>,
  ) {
    setUploadQueue((currentQueue) =>
      currentQueue.map((item) =>
        item.id === id
          ? {
              ...item,
              ...updates,
            }
          : item,
      ),
    );
  }

  function removeUploadItem(id: string) {
    setUploadQueue((currentQueue) => {
      const selectedItem = currentQueue.find((item) => item.id === id);
      if (selectedItem) {
        URL.revokeObjectURL(selectedItem.previewUrl);
      }

      return currentQueue.filter((item) => item.id !== id);
    });
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
    context: "ocr" | "favorite" | "save" | "chat" | "billing",
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

    if (context === "billing") {
      return "Billing is not ready yet. Add Creem API keys and product IDs, then try again.";
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
      setFavorites(data);
    } catch {
      setFavorites([]);
    }
  }

  async function fetchRecentAnalyses() {
    const accessToken = await getAccessToken(supabaseClient);

    if (!accessToken) {
      setRecentAnalyses([]);
      return;
    }

    try {
      const response = await fetch("/api/analyses", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Could not load recent analyses.");
      }

      const data = (await response.json()) as SentenceAnalysis[];
      setRecentAnalyses(data.slice(0, 10));
    } catch (requestError) {
      console.warn("[analyses] Could not load recent analyses:", requestError);
      setRecentAnalyses([]);
    }
  }

  async function fetchBillingProfile() {
    const accessToken = await getAccessToken(supabaseClient);

    if (!accessToken) {
      setBillingProfile(null);
      return;
    }

    try {
      const response = await fetch("/api/billing/profile", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Could not load billing profile.");
      }

      const data = (await response.json()) as BillingProfile;
      setBillingProfile(data);
      setSelectedPlan(data.plan);
    } catch (requestError) {
      console.warn("[billing] Could not load profile:", requestError);
      setBillingProfile(null);
    }
  }

  async function handleCheckout(plan: Exclude<SubscriptionPlan, "free">) {
    setBillingError("");
    setBillingStatus("");
    setCheckoutLoadingPlan(plan);

    try {
      const accessToken = await getAccessToken(supabaseClient);

      if (!accessToken) {
        throw new Error("Login required.");
      }

      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan }),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(errorData?.error ?? "Could not start checkout.");
      }

      const data = (await response.json()) as {
        checkoutUrl: string;
      };
      window.location.href = data.checkoutUrl;
    } catch (requestError) {
      setBillingError(getUserFacingErrorMessage(requestError, "billing"));
    } finally {
      setCheckoutLoadingPlan("");
    }
  }

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setAuthStatus("");
    setAuthVerificationCode("");

    if (!supabaseClient) {
      setError("Missing Supabase public configuration.");
      return;
    }

    if (!authEmail.trim()) {
      setError("Enter your email.");
      return;
    }

    if (!authPassword) {
      setError("Enter your password.");
      return;
    }

    setIsAuthLoading(true);

    try {
      if (authMode === "sign-in") {
        const { data, error: signInError } =
          await supabaseClient.auth.signInWithPassword({
            email: authEmail,
            password: authPassword,
          });

        if (signInError) {
          throw signInError;
        }

        if (!isEmailVerified(data.user)) {
          await supabaseClient.auth.signOut();
          throw new Error("Please verify your email before signing in.");
        }

        if (data.user) {
          setUser(data.user);
        }

        setAuthStatus("Signed in.");
        return;
      }

      const { data, error: signUpError } = await supabaseClient.auth.signUp({
        email: authEmail,
        password: authPassword,
      });

      if (signUpError) {
        throw signUpError;
      }

      if (data.session) {
        await supabaseClient.auth.signOut();
      }

      setIsVerificationPending(true);
      setAuthStatus("Verification code sent. Check your email to finish registration.");
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

  function handleAuthModeChange(nextMode: AuthMode) {
    setAuthMode(nextMode);
    setIsVerificationPending(false);
    setAuthVerificationCode("");
    setAuthStatus("");
    setError("");
  }

  function isEmailVerified(nextUser: User | null) {
    return Boolean(nextUser?.email_confirmed_at || nextUser?.confirmed_at);
  }

  function handleUseAnotherEmail() {
    setIsVerificationPending(false);
    setAuthVerificationCode("");
    setAuthStatus("");
    setError("");
  }

  async function resendSignupVerificationCode(email: string) {
    if (!supabaseClient) {
      throw new Error("Missing Supabase public configuration.");
    }

    const { error: resendError } = await supabaseClient.auth.resend({
      type: "signup",
      email,
    });

    if (resendError) {
      throw resendError;
    }
  }

  async function handleResendVerification() {
    setError("");
    setAuthStatus("");

    if (!authEmail) {
      setError("Enter your email before requesting a verification code.");
      return;
    }

    setIsAuthLoading(true);

    try {
      await resendSignupVerificationCode(authEmail);
      setAuthStatus("A new verification code was sent.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not send verification code.",
      );
    } finally {
      setIsAuthLoading(false);
    }
  }

  async function handleVerifyEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setAuthStatus("");

    if (!supabaseClient) {
      setError("Missing Supabase public configuration.");
      return;
    }

    if (!authVerificationCode.trim()) {
      setError("Enter the verification code from your email.");
      return;
    }

    setIsAuthLoading(true);

    try {
      const { data, error: verifyError } = await supabaseClient.auth.verifyOtp({
        email: authEmail,
        token: authVerificationCode.trim(),
        type: "email",
      });

      if (verifyError) {
        throw verifyError;
      }

      if (data.user) {
        setUser(data.user);
      }

      setIsVerificationPending(false);
      setAuthVerificationCode("");
      setAuthPassword("");
      setAuthStatus("Signed in.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Email verification failed.",
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
    setIsVerificationPending(false);
    setAuthVerificationCode("");
    setAnalysis(null);
    setFavorites([]);
    setChatMessages([]);
    setAuthStatus("");
    router.replace("/learn");
  }

  async function startBatchAnalysis() {
    setError("");

    const nextItem = uploadQueue.find((item) => item.status === "pending");

    if (!nextItem) {
      setError("Please upload a screenshot before analyzing.");
      return;
    }

    await analyzeQueueItem(nextItem);
  }

  async function analyzeQueueItem(queueItem: BatchUploadItem) {
    const formData = new FormData();
    formData.append("image", queueItem.file);
    formData.append("explanationLanguage", explanationLanguage);

    setImage(queueItem.file);
    setActiveQueueItemId(queueItem.id);
    setIsAnalyzing(true);
    setBatchStatus("");
    setAnalysisStatus(copy.analyzing);
    updateQueueItem(queueItem.id, {
      error: undefined,
      status: "processing",
    });

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
        sourceImage: queueItem.file,
      }).catch((persistError) => {
        setError(getUserFacingErrorMessage(persistError, "save"));
        return null;
      });
      const nextAnalysis = persisted ?? data;

      setAnalysis(nextAnalysis);
      upsertRecentAnalysis(nextAnalysis);
      fetchBillingProfile();
      setSectionStates({});
      setChatMessages([]);
      setChatInput("");
      updateQueueItem(queueItem.id, {
        analysisId: nextAnalysis.id,
        status: "ready",
      });
      setAnalysisStatus(
        data.debug
          ? copy.ocrDone((data.debug.elapsedMs / 1000).toFixed(1))
          : copy.ocrDone(((performance.now() - startedAt) / 1000).toFixed(1)),
      );
    } catch (requestError) {
      const message = getUserFacingErrorMessage(requestError, "ocr");
      setError(message);
      setAnalysisStatus("");
      updateQueueItem(queueItem.id, {
        error: message,
        status: "failed",
      });
      await analyzeNextPendingItem(queueItem.id);
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
      const accessToken = await getAccessToken(supabaseClient);
      const response = await fetch("/api/analyze-section", {
        method: "POST",
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
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
      fetchBillingProfile();
      upsertRecentAnalysis(nextAnalysis);
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
    await saveCurrentFavorite();
  }

  async function saveCurrentFavorite() {
    if (!analysis) {
      return null;
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
      upsertRecentAnalysis(nextFavorite);
      setFavorites((currentFavorites) => {
        const withoutDuplicate = currentFavorites.filter(
          (favorite) => favorite.id !== analysis.id,
        );
        return [nextFavorite, ...withoutDuplicate];
      });
      return nextFavorite;
    } catch (requestError) {
      setError(
        getUserFacingErrorMessage(requestError, "favorite"),
      );
      return null;
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
      setRecentAnalyses((currentAnalyses) =>
        currentAnalyses.map((currentAnalysis) =>
          currentAnalysis.id === id
            ? { ...currentAnalysis, isFavorite: false }
            : currentAnalysis,
        ),
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

  function parsePersonalAgentConfig(
    value: unknown,
  ): Partial<PersonalAgentConfig> | null {
    const parsedValue =
      typeof value === "string"
        ? safelyParseJson<Record<string, unknown>>(value)
        : value;

    if (!parsedValue || typeof parsedValue !== "object") {
      return null;
    }

    const config = parsedValue as Partial<PersonalAgentConfig>;

    if (config.mode !== "personal" && config.mode !== "platform") {
      return null;
    }

    return config;
  }

  function safelyParseJson<T>(value: string): T | null {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  function handleSelectFavorite(favorite: SentenceAnalysis) {
    handleSelectAnalysis(favorite);
    router.push("/learn");
  }

  function handleSelectAnalysis(nextAnalysis: SentenceAnalysis) {
    setImage(null);
    setAnalysis(nextAnalysis);
    setExplanationLanguage(nextAnalysis.explanationLanguage || "Chinese");
    setSectionStates({});
    setAnalysisStatus("");
    setChatInput("");
    setChatMessages(nextAnalysis.chatMessages ?? []);
    setError("");

    window.setTimeout(() => {
      resultRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  }

  async function analyzeNextPendingItem(currentItemId: string) {
    const nextItem = uploadQueue.find(
      (item) => item.id !== currentItemId && item.status === "pending",
    );

    if (!nextItem) {
      setActiveQueueItemId("");
      setBatchStatus("Batch complete. Review your recent analyses below.");
      return;
    }

    await analyzeQueueItem(nextItem);
  }

  async function handleMarkCurrentMastered() {
    if (!activeQueueItemId) {
      return;
    }

    updateQueueItem(activeQueueItemId, {
      status: "mastered",
    });
    await analyzeNextPendingItem(activeQueueItemId);
  }

  async function handleFavoriteCurrentAndNext() {
    if (!activeQueueItemId) {
      return;
    }

    const nextFavorite = await saveCurrentFavorite();

    if (!nextFavorite) {
      return;
    }

    updateQueueItem(activeQueueItemId, {
      analysisId: nextFavorite.id,
      status: "favorited",
    });
    await analyzeNextPendingItem(activeQueueItemId);
  }

  function upsertRecentAnalysis(nextAnalysis: SentenceAnalysis) {
    setRecentAnalyses((currentAnalyses) => {
      const withoutDuplicate = currentAnalyses.filter(
        (currentAnalysis) => currentAnalysis.id !== nextAnalysis.id,
      );
      return [nextAnalysis, ...withoutDuplicate].slice(0, 10);
    });
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
    upsertRecentAnalysis(nextAnalysis);
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
      const accessToken = await getAccessToken(supabaseClient);
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
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
      fetchBillingProfile();
      upsertRecentAnalysis({
        ...analysis,
        chatMessages: nextChatMessages,
      });
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

  const activeQueueItem = uploadQueue.find(
    (item) => item.id === activeQueueItemId,
  );
  const activeQueueIndex = activeQueueItem
    ? uploadQueue.findIndex((item) => item.id === activeQueueItem.id)
    : -1;
  const shouldShowBatchActions =
    Boolean(analysis) &&
    Boolean(activeQueueItem) &&
    activeQueueItem?.status === "ready" &&
    activeQueueItem.analysisId === analysis?.id;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight">
                MistakePal
              </h1>
              <Badge>MVP</Badge>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Understand Duolingo sentences from screenshots.
            </p>
          </div>
          {user ? (
            <div className="flex flex-col gap-2 text-sm text-slate-600 sm:items-end">
              <span>{user.email}</span>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                {[
                  { href: "/learn", label: "学习", view: "learn" },
                  { href: "/favorites", label: "收藏", view: "favorites" },
                  { href: "/settings", label: "我的", view: "settings" },
                ].map((item) => (
                  <Link
                    className={`inline-flex h-10 w-fit items-center justify-center rounded-md border px-3 py-2 text-sm font-medium transition ${
                      activeView === item.view
                        ? "border-blue-200 bg-blue-50 text-blue-700"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                    href={item.href}
                    key={item.href}
                  >
                    {item.label}
                  </Link>
                ))}
                <Button
                  className="w-fit"
                  onClick={handleSignOut}
                  type="button"
                  variant="outline"
                >
                  Sign out
                </Button>
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
            authVerificationCode={authVerificationCode}
            error={error}
            isAuthLoading={isAuthLoading}
            isVerificationPending={isVerificationPending}
            isConfigured={Boolean(supabaseClient)}
            onEmailChange={setAuthEmail}
            onModeChange={handleAuthModeChange}
            onPasswordChange={setAuthPassword}
            onResendVerification={handleResendVerification}
            onSubmit={handleAuth}
            onUseAnotherEmail={handleUseAnotherEmail}
            onVerificationCodeChange={setAuthVerificationCode}
            onVerifyEmail={handleVerifyEmail}
          />
        ) : activeView === "settings" ? (
          <UserSettingsPanel
            agentConfig={agentConfig}
            billingError={billingError}
            billingProfile={billingProfile}
            billingStatus={billingStatus}
            billingUrl={billingUrl}
            checkoutLoadingPlan={checkoutLoadingPlan}
            plan={selectedPlan}
            onAgentConfigChange={setAgentConfig}
            onBack={() => router.push("/learn")}
            onCheckout={handleCheckout}
            onPlanChange={setSelectedPlan}
          />
        ) : activeView === "favorites" ? (
          <>
            {error ? (
              <Alert variant="destructive">{error}</Alert>
            ) : null}
            <FavoritesList
              copy={copy}
              deletingFavoriteId={deletingFavoriteId}
              favorites={favorites}
              onDeleteFavorite={handleDeleteFavorite}
              onSelectFavorite={handleSelectFavorite}
            />
          </>
        ) : (
          <>
            <MultiImageUploadCard
              explanationLanguage={explanationLanguage}
              isAnalyzing={isAnalyzing}
              languages={explanationLanguages}
              maxFiles={maxBatchImageCount}
              queue={uploadQueue}
              onFilesSelected={handleImagesSelected}
              onLanguageChange={setExplanationLanguage}
              onRemoveItem={removeUploadItem}
              onStart={startBatchAnalysis}
            />

            {error ? (
              <Alert variant="destructive">{error}</Alert>
            ) : null}

            {analysisStatus ? (
              <Alert>{analysisStatus}</Alert>
            ) : null}

            {batchStatus ? (
              <Alert variant="success">{batchStatus}</Alert>
            ) : null}

            <BatchProgressCard
              activeItemId={activeQueueItemId}
              queue={uploadQueue}
            />

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
                {shouldShowBatchActions ? (
                  <BatchReviewActions
                    currentIndex={activeQueueIndex}
                    isSavingFavorite={isSavingFavorite}
                    totalCount={uploadQueue.length}
                    onFavoriteNext={handleFavoriteCurrentAndNext}
                    onMarkMastered={handleMarkCurrentMastered}
                  />
                ) : null}
              </div>
            ) : (
              <Card className="border-dashed border-slate-300">
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-slate-600">{copy.empty}</p>
                </CardContent>
              </Card>
            )}

            <RecentAnalysesList
              analyses={recentAnalyses}
              onSelectAnalysis={handleSelectAnalysis}
            />
          </>
        )}
      </div>
      {user && analysis ? (
        <ChatCard
          contextSentence={analysis.originalSentence}
          chatInput={chatInput}
          copy={copy}
          isChatLoading={isChatLoading}
          messages={chatMessages}
          onInputChange={setChatInput}
          onSubmit={handleAskQuestion}
        />
      ) : null}
    </main>
  );
}
