create table if not exists sentence_analyses (
  id uuid primary key default gen_random_uuid(),
  image_url text,
  source_language text,
  explanation_language text,
  original_sentence text,
  original_translation text,
  translated_sentence text,
  sentence_breakdown jsonb,
  vocabulary jsonb,
  grammar_points jsonb,
  similar_examples jsonb,
  learner_tip text,
  is_favorite boolean default false,
  created_at timestamptz default now()
);
