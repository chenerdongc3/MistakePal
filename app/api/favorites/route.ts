import { NextResponse } from "next/server";
import {
  getUserFromRequest,
  type SentenceAnalysisRow,
} from "../../../lib/supabase-server";

export async function GET(request: Request) {
  const { supabase, user, error: authError } = await getUserFromRequest(request);

  if (!supabase || !user) {
    return NextResponse.json(
      { error: authError ?? "Login required." },
      { status: authError === "Missing Supabase configuration." ? 500 : 401 },
    );
  }

  const { data, error } = await supabase
    .from("sentence_analyses")
    .select(
      [
        "id",
        "user_id",
        "image_url",
        "source_language",
        "explanation_language",
        "original_sentence",
        "original_translation",
        "translated_sentence",
        "sentence_breakdown",
        "vocabulary",
        "grammar_points",
        "similar_examples",
        "learner_tip",
        "is_favorite",
        "created_at",
      ].join(","),
    )
    .eq("is_favorite", true)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    console.error("[favorites] Supabase read failed:", error.message);
    return NextResponse.json(
      { error: "Could not load favorites." },
      { status: 500 },
    );
  }

  return NextResponse.json(
    ((data ?? []) as unknown as SentenceAnalysisRow[]).map(mapRowToAnalysis),
  );
}

function mapRowToAnalysis(row: SentenceAnalysisRow) {
  return {
    id: row.id,
    imageUrl: row.image_url ?? "",
    sourceLanguage: row.source_language ?? "",
    explanationLanguage: row.explanation_language ?? "",
    originalSentence: row.original_sentence ?? "",
    originalTranslation: row.original_translation ?? "",
    translatedSentence: row.translated_sentence ?? undefined,
    sentenceBreakdown: row.sentence_breakdown ?? [],
    vocabulary: row.vocabulary ?? [],
    grammarPoints: row.grammar_points ?? [],
    similarExamples: row.similar_examples ?? [],
    learnerTip: row.learner_tip ?? undefined,
    isFavorite: Boolean(row.is_favorite),
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}
