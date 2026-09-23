# Deploying BuildTripForYou to Vercel

The app is a standard Next.js (App Router) project — Vercel needs no
config file, it auto-detects the framework. This guide covers what's
specific to BuildTripForYou.

## 1. Prerequisites

- The repo is pushed to GitHub (or GitLab/Bitbucket).
- You've completed the [Supabase setup in the README](README.md#connect-supabase-required-for-auth--saved-trips)
  — project created, `supabase/migrations/*.sql` run in order, URL + anon key in hand.
- Optional but recommended before going live: real keys for
  `ANTHROPIC_API_KEY`, `GOOGLE_MAPS_API_KEY` / `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY`,
  and `WEATHER_API_KEY` (see the README's "Connect real AI / Maps / Weather"
  section). None are required to deploy — every provider falls back to its
  mock/demo mode — but a production deploy without them will show "Demo
  data" badges throughout.

## 2. Import the project

1. [vercel.com/new](https://vercel.com/new) → import the BuildTripForYou GitHub repo.
2. Framework Preset: **Next.js** (auto-detected). Leave build/output settings default.

## 3. Set environment variables

In the Vercel project's **Settings → Environment Variables**, add every
variable from [`.env.local.example`](.env.local.example) that you have a
real value for:

| Variable | Required to deploy? | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes, for auth/saved trips | From Supabase Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes, for auth/saved trips | Same page — the **anon public** key, not service role |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Reserved for future admin-only operations; not currently read anywhere |
| `ANTHROPIC_API_KEY` | No | Without it, AI planning/assistant run in template/scripted mode |
| `GOOGLE_MAPS_API_KEY` | No | Without it, routing/places run in mock mode |
| `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY` | No | Without it, the Map screen shows a stop-list instead of an interactive map |
| `WEATHER_API_KEY` | No | Without it, weather runs in mock mode |
| `PEXELS_API_KEY` | No | Without it, trip hero-photo search shows placeholder demo photos |
| `AVIATIONSTACK_API_KEY` | No | Without it, flight status checks show demo status data |
| `MYTRIP_ACCESS_CODE` | Yes, to unlock /my-trip | A 6-digit passcode gating /my-trip (src/middleware.ts) — unset means /my-trip is blocked entirely, not open |

Apply each to **Production** (and Preview, if you want PR previews to
behave the same way).

## 4. Deploy

Click **Deploy**. First build takes a few minutes.

## 5. Post-deploy — point Supabase Auth at your real domain

Supabase Auth needs to know your production URL for redirects to work:

1. Supabase dashboard → **Authentication → URL Configuration**.
2. Set **Site URL** to your Vercel domain (e.g. `https://buildtripforyou.vercel.app`).
3. Add it to **Redirect URLs** too.

## 6. Post-deploy — restrict your API keys to your domain

If you added real Google Maps / embed keys, go to Google Cloud Console →
Credentials and add an HTTP referrer restriction for your Vercel domain
(and any custom domain) on each key — this is what keeps a key that's
technically public (`NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY`) from being usable
by anyone who copies it out of your page source.

## Notes

- Changing a `NEXT_PUBLIC_*` variable requires a redeploy — it's baked
  into the client bundle at build time, not read at runtime.
- The GitHub Actions workflow (`.github/workflows/ci.yml`) runs lint,
  typecheck, tests, and a build with no secrets on every push/PR — it's
  a pre-deploy safety net, not a deploy step itself (Vercel handles
  the actual deploy on push to the connected branch).
