# PostHog product analytics

hudxyz uses PostHog Cloud for product analytics and funnels. Vercel Web Analytics stays enabled for a **14-day comparison window**, then should be removed once PostHog totals look reliable.

## Project setup (dashboard)

1. Create a PostHog Cloud project.
2. Copy the project API key into `NEXT_PUBLIC_POSTHOG_KEY` (and set `NEXT_PUBLIC_POSTHOG_HOST` if not US cloud).
3. **Enable cookieless mode** in project settings. Without this, cookieless client events are dropped.
4. Set a **billing limit of $0** (or the free-tier ceiling) so usage stays free at current scale.
5. Do **not** enable autocapture, session replay, or person profiles for this site without a privacy review.

Client config lives in `apps/web/src/lib/analytics/` and is initialized from `instrumentation-client.ts`.

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
   `$pageview` where pathname starts with `/apps` → `$pageview` matching `/apps/:slug/:publicId` → `listing_opened`

2. **Simulator load**  
   `$pageview` pathname `/simulator` → `simulator_load_requested` → `simulator_load_succeeded`  
   (break down failures with `simulator_load_failed` by `failure_stage`)

3. **Submit**  
   `$pageview` pathname `/apps/submit` → `submission_started` → `submission_icon_uploaded` → `submission_completed`

## Launch dashboard

One compact dashboard:

- Visitors / pageviews / top referrers (compare with Vercel during overlap)
- `listing_opened` by `kind` and source page
- Simulator success rate (`succeeded` / `requested`) and failures by `failure_stage`
- Submission completion (`completed` / `started`)
- `listing_shared` by `channel`

## After 14 days

If PostHog is collecting production traffic and funnel events correctly:

1. Remove `<Analytics />` from `apps/web/src/app/layout.tsx` and drop `@vercel/analytics`.
2. Disable Web Analytics in the Vercel project dashboard.
3. Revise privacy copy so PostHog is the sole product-analytics service (Vercel remains hosting).
