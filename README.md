# MistakePal

MistakePal is an AI mistake notebook for language learners. The MVP lets a user upload a Duolingo screenshot, extracts the sentence pair with Gemini, analyzes the sentence on demand, supports follow-up AI chat, and saves favorite sentence cards with Supabase.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Auth, Database, and Storage
- Google AI Studio / Gemini
- Docker-ready standalone Next.js runtime

## Environment

Create `.env.local` from `.env.example`:

```bash
cp .env.example .env.local
```

Required values:

```bash
GEMINI_API_KEY=your_google_ai_studio_api_key
SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SCREENSHOT_BUCKET=sentence-screenshots
LANGSMITH_TRACING=false
LANGSMITH_PROJECT=mistakepal-agent
```

Optional but useful for server-side Storage uploads:

```bash
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
LANGSMITH_API_KEY=your_langsmith_api_key
NEXT_PUBLIC_BILLING_URL=https://your-billing-or-checkout-url
```

Keep `SUPABASE_SERVICE_ROLE_KEY` server-only. Never expose it as a `NEXT_PUBLIC_*` value.
`NEXT_PUBLIC_BILLING_URL` is used by the AI chat quota purchase entry.

## Supabase Setup

Run the SQL in `supabase/schema.sql` in your Supabase SQL Editor. It creates:

- `public.sentence_analyses`
- row-level security policies for each user to manage their own favorites
- private Storage bucket `sentence-screenshots`
- Storage policies that let authenticated users upload/read screenshots under their own user-id folder

## Local Development

```bash
npm install
npm run dev
```

Open:

```txt
http://127.0.0.1:3000
```

Health check:

```txt
http://127.0.0.1:3000/api/health
```

## Docker

Build and run with your `.env.local`:

```bash
docker compose --env-file .env.local up --build
```

Open:

```txt
http://127.0.0.1:3000
```

If port `3000` is already used by local development, run the container on another host port:

```bash
APP_PORT=3002 docker compose --env-file .env.local up --build
```

Then open:

```txt
http://127.0.0.1:3002
```

Stop:

```bash
docker compose down
```

## API Routes

- `POST /api/analyze-screenshot`
  - accepts `multipart/form-data`
  - fields: `image`, `explanationLanguage`
  - runs screenshot OCR with Gemini
  - uploads the screenshot to Supabase Storage when credentials/policies allow it

- `POST /api/analyze-section`
  - analyzes one on-demand section: `breakdown`, `vocabulary`, `grammar`, `examples`, or `tip`

- `POST /api/chat`
  - answers follow-up questions using the current sentence analysis as context
  - can call read-only learning tools for breakdown, vocabulary, grammar, examples, and learner tips
  - accepts an optional personal agent API config from the browser; Gemini keeps tool support, while OpenAI-compatible providers use the same sentence context directly
  - returns `answer` plus short `toolEvents` for the UI

- `GET /api/favorites`
  - returns the latest 5 favorite analyses for the signed-in user

- `PATCH /api/sentence-analyses/[id]/favorite`
  - saves or updates a favorite analysis

- `DELETE /api/sentence-analyses/[id]/favorite`
  - deletes a favorite analysis

## Notes

- The app requires Supabase Auth before the main workflow is shown.
- Screenshot upload can work either through `SUPABASE_SERVICE_ROLE_KEY` or through authenticated user Storage policies.
- The UI avoids broken image icons by falling back to a simple unavailable state when a saved screenshot URL is missing or invalid.
- LangSmith tracing is optional. Set `LANGSMITH_TRACING=true`, `LANGSMITH_API_KEY`, and `LANGSMITH_PROJECT=mistakepal-agent` to inspect chat model runs and tool calls.
