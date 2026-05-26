import { NextResponse } from "next/server";
import { getUserFromRequest } from "../../../../../lib/supabase-server";

type FavoriteBody = {
  isFavorite?: boolean;
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
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as FavoriteBody;
  const isFavorite = body.isFavorite ?? true;
  const { supabase, user, error: authError } = await getUserFromRequest(request);

  if (!supabase || !user) {
    return NextResponse.json(
      {
        error: authError ?? "Login required.",
      },
      { status: authError === "Missing Supabase configuration." ? 500 : 401 },
    );
  }

  const { data, error } = await supabase
    .from("sentence_analyses")
    .upsert(
      {
        id,
        user_id: user.id,
        image_url: body.imageUrl ?? null,
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
        is_favorite: isFavorite,
      },
      { onConflict: "id" },
    )
    .select("id,is_favorite,created_at")
    .single();

  if (error) {
    console.error("[favorite] Supabase upsert failed:", error.message);
    return NextResponse.json(
      { error: "Could not save this favorite." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    id: data.id,
    isFavorite: Boolean(data.is_favorite),
    createdAt: data.created_at,
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, user, error: authError } = await getUserFromRequest(request);

  if (!supabase || !user) {
    return NextResponse.json(
      {
        error: authError ?? "Login required.",
      },
      { status: authError === "Missing Supabase configuration." ? 500 : 401 },
    );
  }

  const { error } = await supabase
    .from("sentence_analyses")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("[favorite] Supabase delete failed:", error.message);
    return NextResponse.json(
      { error: "Could not delete this favorite." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    id,
    deleted: true,
  });
}
