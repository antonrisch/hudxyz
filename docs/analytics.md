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

## Success definition

A visitor successfully loads a real third-party URL into the 600×600 D-pad surface and reaches ready — preferably arriving from a published hub.

## North-star metrics

- **Weekly Successful Preview Sessions (WSPS)** — distinct PostHog sessions with ≥1 `simulator_load_succeeded`. **Primary** success metric.
- **Supporting:** catalog share of successful loads (`source = catalog`); `/hubs` → `hub_try_clicked` → `simulator_load_succeeded` funnel; submit started → completed; simulator success rate (`succeeded` / `requested`).
- **Daily Core Users (DCU)** — **frozen / omit** until hubs has a few weeks of clean traffic. Do not redefine as `hub_try_clicked OR simulator_load_succeeded` (that counts intent without success). If revived later, use successful engagement only (`simulator_load_succeeded`).
- Raw `$pageview` DAU is acquisition-only. Do **not** use all-user WAU / MAU / retention across mixed identity modes.
- Retention charts must filter `analytics_identity_mode = persistent` only.

### Deprecated (apps listings)

Do not use for new dashboards: `listing_opened`, `listing_shared`, `submission_icon_uploaded`. Historical events may still exist in PostHog taxonomy.

## Events

| Event                      | When                                                    |
| -------------------------- | ------------------------------------------------------- |
| `$pageview`                | Sanitized pathname only (no query / simulator URL)      |
| `search_result_selected`   | Palette hub result or “view all”                        |
| `hub_try_clicked`          | Directory **Try** (marks next load as `source=catalog`) |
| `simulator_load_requested` | Any simulator navigation (seed, URL bar, reload)        |
| `simulator_load_succeeded` | App surface reaches ready                               |
| `simulator_load_failed`    | Timeout or proxy failure                                |
| `submission_started`       | First hub stub draft created                            |
| `submission_completed`     | Hub submit for review succeeds                          |

`simulator_load_*` carry `source: "catalog" | "custom"`. Directory Try sets a short-lived sessionStorage marker so the following load is `catalog` without putting analytics state in the share URL.

Outbound hub homepage links stamp `utm_source=hudxyz.com&utm_medium=referral&utm_campaign=directory` for **hub owners’** analytics — not captured as PostHog product events.

## Inbound acquisition (Reddit / Product Hunt)

URL sanitize strips query strings from `$current_url` / referrer fields but **leaves PostHog `$utm_*` properties intact**. Use this convention on outreach links:

| Param          | Reddit (P0)         | Product Hunt (later) |
| -------------- | ------------------- | -------------------- |
| `utm_source`   | `reddit`            | `producthunt`        |
| `utm_medium`   | `social`            | `social`             |
| `utm_campaign` | thread-or-week slug | launch slug          |

Example: `https://hudxyz.com/hubs?utm_source=reddit&utm_medium=social&utm_campaign=2026-07-mrbd`.

Break WSPS (and directory → try) down by `$utm_source` / `$utm_campaign` to measure outreach.

## Funnels

1. **Directory → try → success**  
   `$pageview` pathname `/hubs` → `hub_try_clicked` → `simulator_load_succeeded` (filter or break down by `source = catalog`)

2. **Simulator load**  
   `$pageview` pathname `/simulator` → `simulator_load_requested` → `simulator_load_succeeded`  
   (failures: `simulator_load_failed` by `failure_stage`; catalog vs custom via `source`)

3. **Submit**  
   `$pageview` pathname `/hubs/submit` → `submission_started` → `submission_completed`

## Launch dashboard

Pinned **[hudxyz Launch](https://us.posthog.com/project/513589/dashboard/1852567)** (production `$host = hudxyz.com`). After this hubs refactor, update tiles to:

1. Weekly Successful Preview Sessions (vs previous week) — **primary**
2. Catalog vs custom share of `simulator_load_succeeded` (`source`)
3. Directory → try → success funnel (`/hubs` → `hub_try_clicked` → `simulator_load_succeeded`)
4. Simulator success rate (`succeeded` / `requested`)
5. Submit funnel (`submission_started` → `submission_completed`)
6. WSPS (or try funnel) broken down by `$utm_source` / `$utm_campaign` for Reddit outreach
7. Consented retention (`analytics_identity_mode = persistent` only — never label as total-site retention)

**Archive / remove** apps-era tiles: Daily Core Users (listing-based), listing opens by kind, listing shares. The generic starter dashboard stays unpinned — its all-user WAU / retention tiles are misleading under cookieless identity.

## After 14 days

If PostHog is collecting production traffic and funnel events correctly:

1. Remove `<Analytics />` from `apps/web/src/app/layout.tsx` and drop `@vercel/analytics`.
2. Disable Web Analytics in the Vercel project dashboard.
3. Revise privacy copy so PostHog is the sole product-analytics service (Vercel remains hosting).
