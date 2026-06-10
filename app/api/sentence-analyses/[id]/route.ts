import { NextResponse } from "next/server";
import { uploadScreenshot } from "../../../../lib/server/screenshot-storage";
import { getUserFromRequest } from "../../../../lib/supabase-server";

type AnalysisBody = {
  image?: File;
  imageUrl?: string;
  sourceLanguage?: string;
  explanationLanguage?: string;
  originalSentence?: string;
  originalTranslation?: string;
  translatedSentence?: string;
  sentenceBreakdown?: unknown;
  vocabulary?: unknown;
  grammarPoints?: unknown;
  similarExamples?: unknown;
  learnerTip?: string;
  chatMessages?: unknown;
  isFavorite?: boolean;
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await parseAnalysisBody(request);
  const { supabase, user, error: authError } = await getUserFromRequest(request);

  if (!supabase || !user) {
    return NextResponse.json(
      { error: authError ?? "Login required.", code: "AUTH_REQUIRED" },
      { status: authError === "Missing Supabase configuration." ? 500 : 401 },
    );
  }

  const imageUrl =
    body.imageUrl || (body.image ? await uploadScreenshot(body.image, request) : "");

  const { data, error } = await supabase
    .from("sentence_analyses")
    .upsert(
      {
        id,
        user_id: user.id,
        image_url: imageUrl || null,
        source_language: body.sourceLanguage ?? null,
        explanation_language: body.explanationLanguage ?? null,
        original_sentence: body.originalSentence ?? null,
        original_translation: body.originalTranslation ?? null,
        translated_sentence: body.translatedSentence ?? null,
        sentence_breakdown: body.sentenceBreakdown ?? [],
        vocabulary: body.vocabulary ?? [],
        grammar_points: body.grammarPoints ?? [],
        similar_examples: body.similarExamples ?? [],
        learner_tip: body.learnerTip ?? null,
        chat_messages: body.chatMessages ?? [],
        is_favorite: body.isFavorite ?? false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    .select("id,image_url,is_favorite,created_at,updated_at")
    .single();

  if (error) {
    console.error("[sentence-analysis] Supabase upsert failed:", error.message);
    return NextResponse.json(
      { error: "Could not save this analysis.", code: "SAVE_FAILED" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    id: data.id,
    imageUrl: data.image_url ?? "",
    isFavorite: Boolean(data.is_favorite),
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  });
}

async function parseAnalysisBody(request: Request): Promise<AnalysisBody> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const image = formData.get("image");

    return {
      image: image instanceof File ? image : undefined,
      imageUrl: formData.get("imageUrl")?.toString() || undefined,
      sourceLanguage: formData.get("sourceLanguage")?.toString() || undefined,
      explanationLanguage:
        formData.get("explanationLanguage")?.toString() || undefined,
      originalSentence: formData.get("originalSentence")?.toString() || undefined,
      originalTranslation:
        formData.get("originalTranslation")?.toString() || undefined,
      translatedSentence:
        formData.get("translatedSentence")?.toString() || undefined,
      sentenceBreakdown: parseJsonFormValue(formData.get("sentenceBreakdown"), []),
      vocabulary: parseJsonFormValue(formData.get("vocabulary"), []),
      grammarPoints: parseJsonFormValue(formData.get("grammarPoints"), []),
      similarExamples: parseJsonFormValue(formData.get("similarExamples"), []),
      learnerTip: formData.get("learnerTip")?.toString() || undefined,
      chatMessages: parseJsonFormValue(formData.get("chatMessages"), []),
      isFavorite: formData.get("isFavorite")?.toString() === "true",
    };
  }

  return (await request.json()) as AnalysisBody;
}

function parseJsonFormValue(value: FormDataEntryValue | null, fallback: unknown) {
  if (typeof value !== "string" || !value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return fallback;
  }
}
