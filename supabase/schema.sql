create table if not exists sentence_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
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

alter table public.sentence_analyses
  add column if not exists translated_sentence text,
  add column if not exists learner_tip text;

create index if not exists sentence_analyses_favorites_created_at_idx
  on sentence_analyses (created_at desc)
  where is_favorite = true;

create index if not exists sentence_analyses_user_favorites_created_at_idx
  on public.sentence_analyses (user_id, created_at desc)
  where is_favorite = true;

alter table public.sentence_analyses enable row level security;

drop policy if exists "Users can read own sentence analyses" on public.sentence_analyses;
drop policy if exists "Users can insert own sentence analyses" on public.sentence_analyses;
drop policy if exists "Users can update own sentence analyses" on public.sentence_analyses;
drop policy if exists "Users can delete own sentence analyses" on public.sentence_analyses;

create policy "Users can read own sentence analyses"
  on public.sentence_analyses
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own sentence analyses"
  on public.sentence_analyses
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own sentence analyses"
  on public.sentence_analyses
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own sentence analyses"
  on public.sentence_analyses
  for delete
  to authenticated
  using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('sentence-screenshots', 'sentence-screenshots', false)
on conflict (id) do nothing;
