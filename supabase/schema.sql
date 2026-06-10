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
  chat_messages jsonb default '[]'::jsonb,
  is_favorite boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.sentence_analyses
  add column if not exists translated_sentence text,
  add column if not exists learner_tip text,
  add column if not exists chat_messages jsonb default '[]'::jsonb,
  add column if not exists updated_at timestamptz default now();

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

drop policy if exists "Users can upload own screenshots" on storage.objects;
drop policy if exists "Users can read own screenshots" on storage.objects;

create policy "Users can upload own screenshots"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'sentence-screenshots'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can read own screenshots"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'sentence-screenshots'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create table if not exists public.user_billing_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free',
  subscription_status text not null default 'inactive',
  creem_customer_id text,
  creem_subscription_id text,
  current_period_end timestamptz,
  quota_period_start timestamptz default now(),
  quota_period_end timestamptz default (now() + interval '1 month'),
  monthly_ocr_quota int not null default 20,
  monthly_ai_quota int not null default 50,
  used_ocr_count int not null default 0,
  used_ai_count int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.user_billing_profiles enable row level security;

drop policy if exists "Users can read own billing profile" on public.user_billing_profiles;
drop policy if exists "Users can insert own billing profile" on public.user_billing_profiles;
drop policy if exists "Users can update own billing profile" on public.user_billing_profiles;

create policy "Users can read own billing profile"
  on public.user_billing_profiles
  for select
  to authenticated
  using (auth.uid() = user_id);
