# PostHog product analytics

hudxyz uses PostHog Cloud for product analytics and funnels. Consent is managed by **c15t** (`@c15t/nextjs`). Vercel Web Analytics stays enabled for a **14-day comparison window**, then should be removed once PostHog totals look reliable.

## Cookie / identity model

| Consent (measurement) | PostHog identity                           | Cross-day retention |
| --------------------- | ------------------------------------------ | ------------------- |
| Granted               | Persistent cookies / local storage         | Valid               |
| Declined / pending    | Daily cookieless server hash (`on_reject`) | Not trustworthy     |

Every event is enriched centrally with `analytics_identity_mode: "persistent" | "cookieless"`. Use persistent-only filters for retention; keep all-visitor daily metrics unfiltered (both modes). Changing consent mid-day can create a rare same-day identity transition.

Client config lives in `apps/web/src/lib/analytics/` and is initialized from `instrumentation-client.ts`. Consent UI is mounted from `apps/web/src/components/consent/consent-manager.tsx` in the root layout. Footer “Privacy settings” reopens the dialog via `ConsentDialogLink`.

## Project setup (dashboard)

1. Create a PostHog Cloud project.
2. Copy the project API key into `NEXT_PUBLIC_POSTHOG_KEY` (and set `NEXT_PUBLIC_POSTHOG_HOST` if not US cloud).
3. **Enable cookieless server-hash mode** in project settings. Without this, cookieless client events are dropped.
4. Create a c15t hosted instance and set `NEXT_PUBLIC_C15T_BACKEND_URL`. When unset, the app uses offline mode with a worldwide opt-in banner (strict fallback also used if the hosted backend is unreachable).
5. Configure only **necessary** + **measurement** categories (no marketing). Hosted geo policy should opt-in where required, opt-out where permitted, and respect GPC.
6. Set a **billing limit of $0** (or the free-tier ceiling) so usage stays free at current scale.
7. Do **not** enable autocapture, session replay, or person profiles for this site without a privacy review.

## North-star metrics

- **Weekly Successful Preview Sessions (WSPS)** — distinct PostHog sessions with ≥1 `simulator_load_succeeded`. Primary success metric.
- **Daily Core Users (DCU)** — unique daily visitors with `listing_opened` (`kind = launch`) **or** `simulator_load_succeeded`. Supporting daily metric; prefer the 7-day average.
- Raw `$pageview` DAU is acquisition-only. Do **not** use all-user WAU / MAU / retention across mixed identity modes.

## Events

| Event                      | When                                                           |
| -------------------------- | -------------------------------------------------------------- |
| `$pageview`                | Sanitized pathname only (no query / simulator URL)             |
| `search_result_selected`   | Palette result or “view all”                                   |
| `listing_opened`           | Try in Simulator / Open on Glasses (`kind`: `sim` \| `launch`) |
| `listing_shared`           | Native share, copy, or social channel                          |
| `simulator_load_requested` | Any simulator navigation (seed, URL bar, reload)               |
| `simulator_load_succeeded` | App surface reaches ready                                      |
| `simulator_load_failed`    | Timeout or proxy failure                                       |
| `submission_started`       | First stub draft created                                       |
| `submission_icon_uploaded` | Icon upload or URL autofill import                             |
| `submission_completed`     | Submit for review succeeds                                     |

Turso `launch_count` / `sim_count` remain the authoritative business counters.

## Funnels to create

1. **Directory → try**  
   `$pageview` where pathname starts with `/hubs` → directory browse
   (legacy listing detail paths redirect; no per-hub public detail page)

2. **Simulator load**  
   `$pageview` pathname `/simulator` → `simulator_load_requested` → `simulator_load_succeeded`  
   (break down failures with `simulator_load_failed` by `failure_stage`)

3. **Submit**  
   `$pageview` pathname `/hubs/submit` → `submission_started` → `submission_icon_uploaded` → `submission_completed`

## Launch dashboard

Pinned **[hudxyz Launch](https://us.posthog.com/project/513589/dashboard/1852567)** dashboard (production `$host = hudxyz.com`):

1. Weekly Successful Preview Sessions (vs previous week)
2. 7-day average Daily Core Users (vs previous 7 days)
3. Daily Core Users trend (30 days)
4. Daily visitors and core-user rate (`$pageview` DAU + DCU/visitor)
5. Consented retention (filter `analytics_identity_mode = persistent` only — never label as total-site retention)

Supporting tiles on the same dashboard: simulator success rate, submission funnel, listing opens by kind, listing shares. The generic starter dashboard is unpinned — its all-user WAU / retention tiles are misleading under cookieless identity.

As of dashboard creation, production custom events (`simulator_load_succeeded`, `listing_opened`, `analytics_identity_mode`, etc.) were not yet visible in PostHog taxonomy — re-check `$host`, `kind`, `source`, and `analytics_identity_mode` after a controlled production visit, then compare DCU with Turso `launch_count` / `sim_count` for obvious collection gaps.

## After 14 days

If PostHog is collecting production traffic and funnel events correctly:

1. Remove `<Analytics />` from `apps/web/src/app/layout.tsx` and drop `@vercel/analytics`.
2. Disable Web Analytics in the Vercel project dashboard.
3. Revise privacy copy so PostHog is the sole product-analytics service (Vercel remains hosting).
