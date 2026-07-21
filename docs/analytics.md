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
7. Do **not** enable autocapture, session replay, heatmaps, or person profiles for this site without a privacy review.

## Privacy denylist

Product events must never include:

- Proxied app URL, hostname, query string, or deep-link URI
- App name / free text typed by the user
- Clipboard contents
- Custom background file names, MIME types, dimensions, blob sizes, or image bytes
- Recording / screenshot media bytes or browser display-surface labels

Sanitization is enforced in three places:

1. Typed `AnalyticsEventMap` (`events.ts`) — preferred contract
2. `stripDeniedAnalyticsProperties` in `track()` — defensive backstop for custom events
3. `sanitizeAnalyticsUrl` for `$pageview` and Sentry router-transition URLs (pathname only)

## Consent queue

Typed product events fired before c15t measurement consent settles are held in a bounded in-memory queue (max 32). After `syncPostHogMeasurementConsent` sets the identity mode and PostHog consent state, the queue flushes in order. Events are dropped when PostHog is disabled or unavailable. Pageviews stay deferred and sanitized separately.

Inspect queue depth for weekly QA via `getPendingAnalyticsEventCount()` (exported from `@/lib/analytics`) in a local console session — there is no production dashboard for this yet.

## Success definition

A visitor successfully loads a real third-party URL into the 600×600 D-pad surface and reaches ready — preferably arriving from a published hub.

## North-star metrics

- **Weekly Successful Preview Sessions (WSPS)** — distinct PostHog sessions with ≥1 `simulator_load_succeeded`. **Primary** success metric. Prefer counting distinct `load_id` terminal successes when joining requested → succeeded.
- **Supporting:** catalog share of successful loads (`source = catalog`); `/hubs` → `hub_try_clicked` → same-`public_id` `simulator_load_succeeded` funnel; submit started → completed; simulator success rate (terminal succeeded `load_id` / requested `load_id`).
- **Daily Core Users (DCU)** — **frozen / omit** until hubs has a few weeks of clean traffic.
- Raw `$pageview` DAU is acquisition-only. Do **not** use all-user WAU / MAU / retention across mixed identity modes.
- Retention charts must filter `analytics_identity_mode = persistent` only — defer a persistent-only retention tile until several complete weekly cohorts exist.

### Deprecated (apps listings)

Do not use for new dashboards: `listing_opened`, `listing_shared`, `submission_icon_uploaded`. Historical events may still exist in PostHog taxonomy.

## Events

### Core funnel

| Event                      | When                                                    | Key properties                                       |
| -------------------------- | ------------------------------------------------------- | ---------------------------------------------------- |
| `$pageview`                | Sanitized pathname only (no query / simulator URL)      | —                                                    |
| `search_result_selected`   | Palette hub result or “view all”                        | `source`, optional `public_id`                       |
| `hub_try_clicked`          | Directory **Try** (marks next load as `source=catalog`) | `public_id`                                          |
| `simulator_load_requested` | Any simulator navigation (seed, URL bar, reload, …)     | `load_id`, `source`, `trigger`, optional `public_id` |
| `simulator_load_succeeded` | App surface reaches ready                               | same + `duration_ms`                                 |
| `simulator_load_failed`    | Timeout, proxy failure, or superseded navigation        | same + `duration_ms`, `failure_stage`                |
| `submission_started`       | First hub stub draft created                            | `public_id`                                          |
| `submission_completed`     | Hub submit for review succeeds                          | `public_id`                                          |

### Simulator load correlation

Every load attempt shares one opaque `load_id` across requested / succeeded / failed.

| Field           | Values                                                                              | Notes                                                                             |
| --------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `source`        | `catalog` \| `custom`                                                               | `catalog` only from a consumed directory Try marker (never from URL↔hub matching) |
| `trigger`       | `seed` \| `typed` \| `recent` \| `popular` \| `reload` \| `settings` \| `os_launch` | Interaction that started the attempt                                              |
| `public_id`     | hub public id                                                                       | Only when the Try marker carried one                                              |
| `failure_stage` | `timeout` \| `proxy` \| `navigation_aborted` \| `unknown`                           | Shell-detectable only; no target content                                          |
| `duration_ms`   | number                                                                              | Monotonic clock from request → terminal                                           |

Directory Try sets a short-lived sessionStorage `{ publicId, timestamp }` marker so the following seeded load is `catalog` without putting analytics state in the share URL. Marker is one-shot and expires (~30s). Legacy timestamp-only markers are ignored (catalog requires a verified `public_id`).

### Workflow outcomes

| Event                            | When                                          | Safe properties                                               |
| -------------------------------- | --------------------------------------------- | ------------------------------------------------------------- |
| `open_on_glasses_opened`         | Glasses popover opens                         | `has_url`, `app_name_prefilled`                               |
| `device_setup_link_copied`       | Deep-link copy succeeds                       | `has_url`                                                     |
| `device_setup_link_copy_failed`  | Clipboard write fails                         | `has_url`                                                     |
| `screen_record_capability`       | Once per session when a load reaches ready    | `supported`                                                   |
| `screen_record_started`          | Region capture + encode begins                | —                                                             |
| `screen_record_completed`        | Recording finishes                            | `stop_reason` (`manual` \| `max_duration`), `duration_ms`     |
| `screen_record_failed`           | Start fails or encode yields no media         | `reason` (`unsupported` \| `denied` \| `aborted` \| `encode`) |
| `simulator_screenshot_completed` | Stage download succeeds                       | `trigger` (`button` \| `keyboard`)                            |
| `simulator_screenshot_failed`    | Capture throws                                | `trigger`                                                     |
| `simulator_view_selected`        | View chrome changes (once per view / session) | `from`, `to`, `surface`                                       |
| `background_selected`            | Preset or custom swatch selected              | `background` (exact preset key or `custom`)                   |
| `custom_background_added`        | Upload succeeds                               | `custom_count`                                                |
| `custom_background_removed`      | Custom swatch removed                         | `custom_count`                                                |
| `custom_background_failed`       | Upload rejected                               | `reason` (`size` \| `type` \| `processing`)                   |
| `simulator_additive_changed`     | Display transparency toggle commits           | `additive`                                                    |

**External outcome limits:** copying a glasses setup link is observable; whether the visitor installs the app in Meta AI is not.

Do **not** instrument raw D-pad presses, continuous slider values, pan/zoom, URL typing, or QR payload contents.

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

1. **Directory → try → same-hub success**  
   `$pageview` pathname `/hubs` → `hub_try_clicked` → `simulator_load_succeeded` where `source = catalog` and `public_id` matches the Try (when present)

2. **Simulator load (correlated)**  
   `$pageview` pathname `/simulator` → `simulator_load_requested` → terminal `simulator_load_succeeded` / `simulator_load_failed` joined on `load_id`

3. **Submit**  
   `$pageview` pathname `/hubs/submit` → `submission_started` → `submission_completed`

4. **Workflow completion (examples)**
   - Glasses: `open_on_glasses_opened` → `device_setup_link_copied`
   - Record: `screen_record_capability` (denominator) → `screen_record_started` → `screen_record_completed`
   - Screenshot / view / background: terminal outcome events above

## Launch dashboard

Pinned **[hudxyz Hubs Launch](https://us.posthog.com/project/513589/dashboard/1880501)** (production `$host = hudxyz.com`). Tiles:

1. Weekly Successful Preview Sessions (vs previous week) — **primary**
2. Catalog vs custom share of `simulator_load_succeeded` (`source`)
3. Directory → try → success funnel (`/hubs` → `hub_try_clicked` → `simulator_load_succeeded` with catalog/`public_id`)
4. Simulator success rate via correlated `load_id` (terminal succeeded / requested)
5. Submit funnel (`submission_started` → `submission_completed`)
6. WSPS broken down by `$utm_source` / `$utm_campaign` for Reddit outreach
7. Workflow completion rates (glasses copy, record, screenshot, view, background)
8. Consented retention (`analytics_identity_mode = persistent` only) — defer until several complete weekly cohorts; never label as total-site retention

Do **not** add release- or schema-version dimensions until there is enough volume to compare releases meaningfully.

## Weekly telemetry QA

Lightweight check (no alerting required at current volume):

1. Reconcile `simulator_load_requested` vs terminal (`succeeded` + `failed`) distinct `load_id` counts for the week
2. Spot-check queued-event volume with `getPendingAnalyticsEventCount()` if product outcomes look under-counted on first paint
3. Review `failure_stage = unknown` share — rising share usually means a new shell failure path needs classification

## After 14 days

If PostHog is collecting production traffic and funnel events correctly:

1. Remove `<Analytics />` from `apps/web/src/app/layout.tsx` and drop `@vercel/analytics`.
2. Disable Web Analytics in the Vercel project dashboard.
3. Revise privacy copy so PostHog is the sole product-analytics service (Vercel remains hosting).
