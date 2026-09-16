# BuildTripForYou

**Your AI Travel Companion.** *Plan it. Experience it. Enjoy it.*

BuildTripForYou is an AI-powered travel planning and real-time travel companion. It
plans a trip, helps you navigate it, monitors conditions while you travel,
and recommends adjustments that you approve before they're applied. See the
full Product Requirements Document for the complete vision.

## Tech stack

- [Next.js](https://nextjs.org/) (App Router) + TypeScript (strict mode)
- [Tailwind CSS](https://tailwindcss.com/)
- [Supabase](https://supabase.com/) (Postgres + Auth)
- Google Maps Platform (routing, places) — server-side only
- Weather provider (default: OpenWeatherMap) — swappable
- Anthropic Claude API (AI orchestration)
- Deployed on [Vercel](https://vercel.com/)

## Getting started

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Without any env vars set, the app
still runs end-to-end: AI planning, maps/routing, places, and weather all fall back to
clearly-labeled ("Demo data") mock providers. Trips won't persist, though, until you
connect Supabase (below) — that's the one piece with no mock fallback.

## Connect Supabase (required for auth + saved trips)

1. Create a free project at [supabase.com](https://supabase.com) (no credit card).
2. In the Supabase dashboard, open **SQL Editor** → paste the contents of
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) → Run.
   This creates all tables, Row Level Security policies, and the
   auto-create-profile-on-signup trigger.
3. In **Project Settings → API**, copy the **Project URL** and **anon public** key into
   `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
   ```
4. Restart `npm run dev`. Visit `/signup` to create an account — trips you create will
   now persist in your Supabase project.

## Connect real AI / Maps / Weather (optional)

Each provider auto-detects its key and goes live the moment it's set — no code changes:

| Feature | Env var | Get a key |
| --- | --- | --- |
| AI trip planning + assistant | `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) |
| Maps, routing, places | `GOOGLE_MAPS_API_KEY` | [Google Cloud Console](https://console.cloud.google.com/google/maps-apis) — enable Routes API + Places API |
| Weather | `WEATHER_API_KEY` | [openweathermap.org/api](https://openweathermap.org/api) |

## Project structure

```
src/
├── app/            # Next.js App Router routes (screens) + API route handlers
├── components/     # UI components (auth, destinations, trips, assistant)
├── config/         # Brand constants, trip form options
└── lib/
    ├── ai/
    │   ├── orchestrator.ts   # the one place allowed to persist an agent's output (Rule 6)
    │   ├── client.ts         # Anthropic client factory (null when no API key)
    │   ├── schemas.ts        # Zod schema the planner's output is validated against
    │   └── agents/           # tripPlanner, weather, tripGuardian, itineraryOptimization, assistant
    ├── providers/      # External provider interfaces + real/mock adapter pairs
    │   ├── routing/    # RoutingProvider — Google Routes API / mock
    │   ├── weather/    # WeatherProvider — OpenWeatherMap / mock
    │   └── places/     # PlacesProvider — Google Places / mock
    ├── services/       # trip/destination/routing/weather/recommendation service layer
    ├── db/             # Supabase clients (browser + server) and row<->domain mappers
    └── types/          # Shared TypeScript types (Trip, Destination, Route, ...)
supabase/migrations/    # SQL schema + RLS policies, run in order in the Supabase SQL Editor
```

**Architecture principle**: AI agents never mutate core trip data directly
(Rule 6). Agents return structured, Zod-validated output; the AI Orchestrator
is the only thing allowed to call the service layer to persist it — for the
initial plan because the user already approved by submitting the trip form,
and for in-trip changes only after an explicit "Apply Update" on the Change
Approval screen. External providers (maps, weather, places, AI) are always
accessed through an interface in `src/lib/providers` / `src/lib/ai/client.ts`,
never called directly — each auto-selects its real adapter when the matching
API key is set, and a clearly-labeled mock adapter otherwise, so nothing
mock-sourced is ever presented as verified fact (Rule 5).

## What's implemented

All 13 phases from the PRD's build sequence:

1. **Project Foundation** — scaffolding, brand, provider seams
2. **Authentication + Database** — Supabase schema/RLS, email auth, protected routes
3. **Trip Creation** — the full trip form, persisted via a server action
4. **Destination Intelligence** — Places search/caching, Destination Card, comparison table
5. **AI Trip Planner** — Claude (tool-use, Zod-validated) or a template fallback builds the itinerary
6. **Maps & Routing** — Google Routes API or a deterministic mock; embedded map or a stop-list fallback
7. **Daily Itinerary** — activity timeline with computed travel legs
8. **Weather Integration** — forecast-aware badges on outdoor activities
9. **Trip Guardian** — on-demand monitoring (simulated delay/weather, since there's no live GPS feed) that raises recommendations
10. **Dynamic Replanning** — the Itinerary Optimization Agent + the Apply/Keep Change Approval flow
11. **AI Travel Assistant** — persistent chat widget on every trip screen
12. **Testing + Security** — Vitest unit tests, CI workflow, RLS-backed authorization
13. **Production Deployment** — see [DEPLOYMENT.md](DEPLOYMENT.md)

## Scripts

| Command              | Description                            |
| --------------------- | --------------------------------------- |
| `npm run dev`         | Start the local dev server              |
| `npm run build`       | Production build                        |
| `npm run start`       | Serve the production build              |
| `npm run lint`        | Run ESLint                              |
| `npm run typecheck`   | Run the TypeScript compiler (no emit)   |
| `npm test`            | Run the Vitest unit test suite          |
