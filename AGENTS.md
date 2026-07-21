# AGENTS.md

Guidance for AI agents when working in this repo.

## What this is

A browser-based **simulator for the Meta Ray-Ban Display** (MRBD) — a monocular waveguide smart-glasses screen — plus a public **hub directory** and **submit** flow for MRBD developer hubs. The simulator loads real apps in a faithful **600×600** surface on an ordinary desktop browser and drives them with the glasses' D-pad input model, so MRBD apps can be built and previewed without the hardware.

Single Next.js app in **`apps/web`**. pnpm monorepo, Next.js 16 (App Router) + React 19 + Tailwind v4, shadcn/ui on Base UI primitives. Node >= 22.12. Turso (SQLite) for hubs; Cloudflare R2 for hub logos.

## The MRBD target

The simulator reproduces the two things that make the device different from a normal web page:

- **600×600 fixed viewport** — the waveguide surface.
- **D-pad input** — the device emits `ArrowUp` / `ArrowDown` / `ArrowLeft` / `ArrowRight` + `Enter`, with no pointer. Every action is reached by moving focus to a control and pressing Enter.

(The physical display is additive — white reads opaque, black reads transparent — so MRBD apps are designed white-on-black.)

## The simulator

The simulator lives at **`/simulator`**. **`/`** permanently redirects there (params preserved). The hub directory lives under **`/hubs`**. `/simulator` renders the `Simulator` component (`src/components/simulator/`) as an SPA. A segmented control swaps the **cosmetic chrome** around one persistent device surface — the live iframe never re-mounts on a view switch, so the Scramjet frame stays attached and the proxied page keeps running:

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

## Hub directory & submit

Public catalog of **hubs** (developer/studio entries, shadcn-registry analog), plus a form to submit a new one. Individual app listings are deferred; when they return, `apps.hubId` must be a required FK to `hubs`.

**Routes**

| Route          | Purpose                                                                            |
| -------------- | ---------------------------------------------------------------------------------- |
| `/hubs`        | Flat searchable hub directory (client filter + pagination)                         |
| `/hubs?q=`     | Same page, search query in URL                                                     |
| `/hubs/submit` | Hub draft → logo upload → submit for review (`?id=` = publicId)                    |
| `/padme`       | Internal hub review queue — unlock with `/padme?secret=<REVIEW_SECRET>` (else 404) |
| `/padme/[id]`  | Hub review detail                                                                  |

Legacy `/apps` and `/apps/*` (including old category/collection/listing paths) permanently redirect to `/hubs`.

**Identity.** Each hub has a stable **publicId** (10-char Crockford Base32, `lib/hubs/public-id.ts`) used in draft deep-links, plus a **slug** derived from `name` (not unique).

**Lifecycle.** `draft` → `pending` (submit) → `published` / `rejected` (via `/padme`). Public directory queries only `published`. Contact email is private (review only). `launchUrl` is required (Try → simulator). Logo is required before submit (R2).

**Submit.** One page: details + logo. Client creates a **stub draft** on first save/upload (`POST /api/hubs` `{ stub: true }`), then `PATCH /api/hubs/[id]`, logo presign → R2 PUT → register, then `POST /api/hubs/[id]/submit`. Mutating `/api/hubs/*` requires a submit-session cookie (minted by `src/proxy.ts` on `/hubs/submit` via `SUBMIT_SESSION_SECRET`) plus Vercel BotID (`checkBotId`).

**Review.** `(admin)/padme` — filtered hub queue + detail (edit metadata/logo, approve/reject/send-back). Unlock once via `/padme?secret=<REVIEW_SECRET>` (sets signed cookie, redirects to `/padme`); missing/wrong secret → App Router **`notFound()`** on pages, **404** on `/api/padme/*`.

**Key code.** `src/lib/hubs/` (draft, admin, queries, logo, upload-client, submit-session, botid), `src/components/directory/`, `src/components/submit/hub-submit-form.tsx`, `src/components/padme/` (queue, detail), `src/app/api/hubs/`, `src/app/api/padme/hubs/`, R2 helpers in `src/lib/r2/`. Search is client-side over published hubs (no FTS).

## Layout (`apps/web`)

Application code lives under `src/`. Config, `public/`, and `scripts/` stay at the app root.

- `src/app/(site)/` — marketing + directory: `/` (redirects to `/simulator`), `/hubs`, `/hubs/submit`, legal; shared site header/footer.
- `src/app/(admin)/padme/` — internal hub review UI (`noindex`); unlock with `?secret=`.
- `src/app/simulator/` — simulator SPA.
- `src/app/api/hubs/` — draft/submit + logo presign/register/delete (submit-session + BotID on mutates); `GET /api/hubs/list` for header palette.
- `src/app/api/padme/` — hub review list/detail + logo CRUD (gated by review cookie via `src/proxy.ts`).
- `src/components/` — `simulator/*`, `directory/*`, `submit/*`, `padme/*`, `layout/*` (incl. `search-command`), `ui/*` (shadcn; add with `pnpm dlx shadcn@latest add <name>`).
- `src/lib/` — `proxy.ts` (Scramjet), `simulator/*`, `hubs/*`, `padme/*`, `r2/`, `utils.ts`.
- `src/db/` — Drizzle schema (`users`, `hubs`) + migrations (Turso).
- `public/` — `sw.js` plus generated `scramjet/` + `controller/` bundles.
- `scripts/` — `copy-proxy-assets.mjs`, `wisp-server.mjs`, db helpers.

## Deferred

- **Auth + hub ownership** — Better Auth; wire `hubs.ownerUserId`.
- **Email on submit / approve / reject** — v1.1.
- **App listings under hubs** — reintroduce `apps` with required `hubId` FK; not on the flat directory until designed.
- **Hub public detail pages** — out of scope while the directory stays one flat page.

## Doc ownership

| Doc                         | Owns                                                                                                                                         |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **`AGENTS.md` (this file)** | Product + monorepo: MRBD overview, proxy stack, **directory/submit architecture**, workspace layout, commands, styling tokens                |
| **`apps/web/AGENTS.md`**    | App-local only: Next.js 16 quirks, **button / link / Copy icon conventions**, **simulator state ownership**, **hub submit form rules**, perf |

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

See `apps/web/AGENTS.md` for Next.js 16 notes, simulator state ownership, and hub submit form rules.
