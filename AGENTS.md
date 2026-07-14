# AGENTS.md

Guidance for AI agents when working in this repo.

## What this is

A browser-based **simulator for the Meta Ray-Ban Display** (MRBD) — a monocular waveguide smart-glasses screen — plus a public **apps directory** and **submit** flow for MRBD web apps. The simulator loads real apps in a faithful **600×600** surface on an ordinary desktop browser and drives them with the glasses' D-pad input model, so MRBD apps can be built and previewed without the hardware.

Single Next.js app in **`apps/web`**. pnpm monorepo, Next.js 16 (App Router) + React 19 + Tailwind v4, shadcn/ui on Base UI primitives. Node >= 22.12. Turso (SQLite) for listings; Cloudflare R2 for icons / screenshots / preview video.

## The MRBD target

The simulator reproduces the two things that make the device different from a normal web page:

- **600×600 fixed viewport** — the waveguide surface.
- **D-pad input** — the device emits `ArrowUp` / `ArrowDown` / `ArrowLeft` / `ArrowRight` + `Enter`, with no pointer. Every action is reached by moving focus to a control and pressing Enter.

(The physical display is additive — white reads opaque, black reads transparent — so MRBD apps are designed white-on-black.)

## The simulator

The simulator lives at **`/simulator`** (legacy **`/?…`** query links redirect there with params preserved). **`/`** is the site landing page. It renders the `Simulator` component (`src/components/simulator/`) as an SPA at `/simulator`. A segmented control swaps the **cosmetic chrome** around one persistent device surface — the live iframe never re-mounts on a view switch, so the Scramjet frame stays attached and the proxied page keeps running:

- **Glasses** — the display embedded in the right lens of a glasses-frame SVG (`src/components/simulator/frames.tsx`).
- **1:1** — the surface at its exact 600×600 size, no scaling (`pixel` in `?mode=`).

Cosmetic chrome is `?mode=glasses|pixel` (url-only name; store field is `view`). Set client-side via nuqs, so switching never navigates. `?url=` deep-links a target.

**Structure.** A UI-agnostic core — `src/lib/simulator/store.ts` (a zustand state machine: `screen`, `view`, `url`, `status`) plus `config.ts` — drives a thin presentational shell in `src/components/simulator/`: `index.tsx` wires the proxy / input / url-sync behavior and provides the context; `background/` (backdrop + picker), `panel/` (sidebar, controls, view-switcher, zoom-controls), `header/` (`SimulatorHeader`, url-bar, share), `toolbar/` (index, dpad, screenshot), plus root `device`. The d-pad emits `Intent`s the shell routes by `screen` (keys inject into the proxied app only when `screen === "app"`). `screen` is the **baby MRBD OS** seam: `app` runs the proxied app, `settings` is a blurred control overlay over it, and `home` / `apps` are os screens (stubs) — all on the same persistent surface, so building out the OS is additive.

**Same-origin proxy.** Third-party sites set `frame-ancestors` / `X-Frame-Options` that scope framing to themselves. The simulator re-serves the target **from our own origin** through a **Scramjet v2** service-worker proxy, so the browser treats it as same-origin and renders it. Same-origin also lets the D-pad inject keystrokes straight into the frame.

Request path: `frame.go(url)` points the iframe at a same-origin proxied URL → the service worker (`public/sw.js`) routes it through Scramjet → the engine fetches the real site through a **Wisp** egress server → the response (and every URL/script inside it) is rewritten back through the proxy and rendered.

Key files:

- `src/lib/proxy.ts` — boots the Scramjet v2 controller, registers the SW, wires the libcurl/Wisp transport, and exposes `createFrame(iframe)`.
- `public/sw.js` — the Scramjet v2 service worker; routes proxied requests and stamps COEP/CORP so the cross-origin-isolated host can embed them.
- `scripts/copy-proxy-assets.mjs` — copies the Scramjet engine + controller bundles into `/public/scramjet` and `/public/controller` (runs on install/dev/build).
- `scripts/wisp-server.mjs` — the dev Wisp egress server on `:4000`.
- `next.config.ts` — sets COOP/COEP on `/simulator` (for Scramjet's wasm) and `Service-Worker-Allowed: /` on `/sw.js`.

**Stack pins:** Scramjet engine `2.0.67-alpha.2` (exact-pinned) + scramjet-controller `0.0.14` (the Controller/Frame API, which takes a ProxyTransport directly) + libcurl-transport `2.0.5` + wisp-js. The controller asserts the engine version at construction, so any version drift fails loudly. The v1 stack (Scramjet 1.1.0 + bare-mux + libcurl 1.5.2) lives on tag `scramjet-v1-reference` as a stable-engine reference.

**Prod note:** Wisp wants a persistent WebSocket host, so production runs it on a dedicated always-on box with `NEXT_PUBLIC_WISP_URL` pointing at it. Egress originates from that host, so it carries SSRF protection (hostname blacklist + port restriction) for the public deployment.

## Apps directory & submit

Public catalog of MRBD (and later other) web apps, plus a form to list a new one.

**Routes**

| Route                      | Purpose                                                                        |
| -------------------------- | ------------------------------------------------------------------------------ |
| `/apps`                    | Shelves-only hub; flat results when `?type=` / `?sort=` / `?q=`                |
| `/apps/category/{slug}`    | Category browse (primary or secondary; optional `?type=` / `?sort=` / `?q=`)   |
| `/apps/collections/{slug}` | Published collection / shelf detail                                            |
| `/apps/{slug}/{publicId}`  | Canonical listing detail — resolve by **publicId**; slug is cosmetic SEO crumb |
| `/apps/{slug}`             | Legacy → permanent redirect when exactly one published row matches             |
| `/apps/submit`             | Draft → media upload → submit for review (`?id=` = publicId)                   |
| `/padme`                   | Internal review queue — unlock with `/padme?secret=<REVIEW_SECRET>` (else 404) |

**Identity.** Each app has a stable **publicId** (10-char Crockford Base32, `lib/apps/public-id.ts`) used in URLs and draft deep-links, plus a **slug** derived from `name` (not unique). Prefer `listingPath(slug, publicId)` over hand-rolled paths.

**Lifecycle.** `draft` → `pending` (submit) → `published` / `rejected` (via `/padme`). Public directory queries only `published`. Contact email is private (review only).

**Submit (v1).** One page: details → media (icon required; ≤10 screenshots; optional MP4 preview) → submit. Client creates a **stub draft** on first save/upload (`POST /api/apps` `{ stub: true }`), then `PATCH /api/apps/[id]`, asset presign → R2 PUT → register, then `POST /api/apps/[id]/submit`. Mutating `/api/apps/*` requires a submit-session cookie (minted by `src/proxy.ts` on `/apps/submit` via `SUBMIT_SESSION_SECRET`) plus Vercel BotID (`checkBotId`). PRDs: `docs/prd/`.

**Review (v1).** `(admin)/padme` — filtered queue + detail (edit metadata/media, approve/reject/send-back). Unlock once via `/padme?secret=<REVIEW_SECRET>` (sets signed cookie, redirects to `/padme`); missing/wrong secret → App Router **`notFound()`** on pages, **404** on `/api/padme/*`. Email notifications to submitters are **v1.1**.

**Key code.** `src/lib/apps/` (draft, admin, schema, queries, browse-params, search, search-index, upload-client, asset-limits, submit-session, botid), `src/lib/collections/` (shelf resolution), `src/components/listings/`, `src/components/submit/`, `src/components/padme/`, `src/app/api/apps/` (incl. `search`), `src/app/api/padme/`, R2 helpers in `src/lib/r2/`. Directory keyword search uses an FTS5 virtual table `app_search` (synced from `updateAppForAdmin`; rebuild with `pnpm db --rebuild-search`).

## Layout (`apps/web`)

Application code lives under `src/`. Config, `public/`, and `scripts/` stay at the app root.

- `src/app/(site)/` — marketing + directory: `/`, `/apps`, `/apps/submit`, legal; shared site header/footer.
- `src/app/(admin)/padme/` — internal review UI (`noindex`); queue + detail (`?secret=` unlock).
- `src/app/simulator/` — simulator SPA (legacy `/?…` redirects here).
- `src/app/api/apps/` — draft/submit + asset presign/register/delete (submit-session + BotID on mutates); public `GET /api/apps/search` for header palette.
- `src/app/api/padme/` — review list/detail + asset CRUD (gated by review cookie via `src/proxy.ts`).
- `src/components/` — `simulator/*`, `listings/*`, `submit/*`, `padme/*`, `layout/*` (incl. `search-command`), `ui/*` (shadcn; add with `pnpm dlx shadcn@latest add <name>`).
- `src/lib/` — `proxy.ts` (Scramjet), `simulator/*`, `apps/*` (directory + drafts + admin + uploads + search), `collections/*` (shelves), `padme/*`, `r2/`, `utils.ts`.
- `src/db/` — Drizzle schema + migrations (Turso); FTS5 `app_search` via custom migration (not in `schema.ts`).
- `public/` — `sw.js` plus generated `scramjet/` + `controller/` bundles.
- `scripts/` — `copy-proxy-assets.mjs`, `wisp-server.mjs`, db helpers (`--rebuild-search` backfills FTS).

## Deferred

- **Auth + “my submissions”** — Better Auth; ownership on drafts before public exposure.
- **Email on submit / approve / reject** — v1.1 (reviewer daily digest optional later).
- **App preview video normalize** — v1 accepts browser-ready `video/mp4` only (`src/lib/apps/asset-limits.ts`). Later: background worker with ffprobe/ffmpeg (not App Router) to probe real dimensions/duration, transcode to H.264 MP4 +faststart, optional 600×600 square for MRBD, then write the canonical object to R2.
- **Secondary category / multi-device catalog** — schema supports secondary category; submit UI is primary-only for v1. `targetDevice` stays a string.

## Doc ownership

| Doc                         | Owns                                                                                                                                                   |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`AGENTS.md` (this file)** | Product + monorepo: MRBD overview, proxy stack, **directory/submit architecture**, workspace layout, commands, styling tokens                          |
| **`apps/web/AGENTS.md`**    | App-local only: Next.js 16 quirks, **button / link / Copy icon conventions**, **simulator state ownership**, **listing URL / submit form rules**, perf |

Keep product architecture here. Keep Next/UI/state rules in `apps/web/AGENTS.md`. Do not duplicate either side.

## Styling

Tailwind v4 + the shadcn theme tokens in `src/app/globals.css` (`@theme inline` maps `--color-*` to the `:root` values). Style with the **semantic tokens and shadcn defaults**, not hardcoded Tailwind colors:

- Surfaces, text, borders, accents: `bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary` — not `bg-white` / `border-black/15`.
- Brand accent lives in `--brand` (`#0067ff`), exposed as `bg-brand` / `text-brand`. Add custom colors the same two-step way: raw value in `:root`, then `--color-<name>: var(--<name>)` in `@theme inline`.
- **Exception:** the 600×600 device surface is genuinely black with white-on-black overlays — the MRBD display is additive, so it stays literal `bg-black` / `text-white`, not themed.

## Commands

```sh
pnpm dev          # web app: next dev + the wisp server (via concurrently)
pnpm build        # build all workspaces
pnpm lint         # oxlint over the repo
pnpm format       # oxfmt
```

Per-app: `pnpm --filter @hudxyz/web <script>`. Type-check with `pnpm --filter @hudxyz/web typecheck`.

## Tooling

- pnpm workspaces throughout. Lint is **oxlint**; format is **oxfmt**.
- `pnpm-workspace.yaml` scopes the workspace to `apps/*` and lists `allowBuilds` (esbuild / sharp / scramjet / bufferutil ship prebuilt, so they stay unbuilt).
- **File naming:** kebab-case / lowercase for every `.ts` / `.tsx` file, components included (`simulator.tsx`, `theme-provider.tsx`, `proxy.ts`); lowercase for App Router route files (`page.tsx`). Keeps imports stable on case-sensitive build hosts (Vercel/Linux) even though macOS is case-insensitive.

See `apps/web/AGENTS.md` for Next.js 16 notes, simulator state ownership, and listing URL / submit form rules.
