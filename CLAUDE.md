# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Lenswolf builds glanceable apps for the **Meta Ray-Ban Display** (a monocular waveguide smart-glasses screen). pnpm monorepo, Astro + Tailwind v4. Node >= 22.12.

Timeline: now → late September 2026, targeting Meta's dev conference (likely Gen 2 Display hardware + third-party app showcase). Bias toward shipping several small polished lenses over one big app.

## Decisions already made (don't relitigate)

- **WebApps over native DAT SDK.** Meta offers two routes: native (DAT SDK, iOS/Android, BLE) and WebApps (HTML/CSS/JS in a 600×600 webview). We chose WebApps: the native "Display" API is a fixed component tree (FlexBox/Text/Image/Button/Icon/Video) serialized over Bluetooth — *less* visual control than a real webview, not more. Native is the **escape hatch only if** an app needs the camera, microphone, or speaker audio — those are hard-blocked in WebApps. Informational/visual/glanceable lenses stay web.
- **One glasses origin, paths per app.** Every glasses lens is a path under one origin (`glasses.lenswolf.com/<lens>`), never a subdomain each. Reason: `localStorage` is per-origin, so one anonymous session + one device-pairing must cover all lenses. This is non-negotiable. New lenses go under `apps/glasses/src/pages/<name>/`.
- **Domain topology.** `lenswolf.com` (apex) = `apps/web` (marketing, indexed; later the dashboard, device-link page, and `/api/auth/*` as SSR + noindexed routes). `glasses.lenswolf.com` = `apps/glasses` (all lenses, noindexed). Two Vercel projects sharing this repo. Rejected: single-origin `/apps/*`, microfrontends (over-engineered; a plain Vercel rewrite suffices if a unified URL is ever needed).
- **shadcn/React is web-only; glasses lenses use Solid islands.** shadcn assumes pointer/hover/desktop keyboard and ships React's weight — wrong for the glasses surface. Interactive lenses are **Solid** islands (tiny runtime): inline Tailwind + reactive `snapshot()`, hosted by a zero-JS `.astro` shell. Not React/shadcn.

## Planned stack (not built yet — still static prototyping)

Auth via **Better Auth** (one backend, MIT, self-hostable): `anonymous` plugin for zero-typing sessions, `deviceAuthorization` plugin (RFC 8628 TV-style code flow) for binding glasses to a real account — the glasses have **no text input**, so the wearer reads a short code off the Display and types it on their phone. Web surfaces authenticate via cookies; glasses via Bearer token in `localStorage`. **SQLite via Turso/libSQL** (file-SQLite can't run on Vercel's ephemeral FS). Deploy on **Vercel** (Astro SSR adapter; Better Auth needs a server runtime). Cloudflare Turnstile on the anon endpoint. Anonymous sessions alone are enough to ship the September showcase — the device-code flow is a fast-follow.

## Layout

- `apps/glasses` (`@lenswolf/glasses`) — the device app that runs on the Display. Astro 7 + **Solid** islands (interactive lenses) over a zero-JS `.astro` shell; no React. Primary app (`pnpm dev` targets it).
- `apps/web` (`@lenswolf/web`) — marketing/landing site. Astro 7 + React 19. shadcn/ui installed (`base-luma` preset, **Base UI** primitives not Radix, Lucide icons, Inter font); components in `src/components/ui`, config in `components.json`, theme vars in `src/styles/global.css`. Add components with `pnpm dlx shadcn@latest add <name>` from this dir.
- `packages/ui` (`@lenswolf/ui`) — shared design tokens; exports only `theme.css`.

## Commands

```sh
pnpm dev          # glasses app dev server (localhost:4321) — the default
pnpm dev:web      # web/marketing site dev server
pnpm build        # build all workspaces (pnpm -r build)
pnpm lint         # oxlint over the repo
```

Per-app: `pnpm --filter @lenswolf/glasses <script>` (dev / build / preview / astro). Type-check a workspace with `pnpm --filter @lenswolf/<app> astro check`. No test runner is configured.

## Device constraints (the part that's easy to get wrong)

The glasses app is not a normal responsive web page. It renders to a fixed **600×600** waveguide where **color is opacity**:

- `--color-canvas` (#000 black) = **transparent** on the lens. `--color-ink` (#fff white) = **opaque**. So black is the background everywhere; draw UI in white/`text-ink`. Avoid mid-tones expecting them to read as gray — they read as partial transparency.
- `--color-accent` (#CEFF00, bright lime) is the focus ring / accent.
- These three tokens live in `packages/ui/theme.css` as a Tailwind v4 `@theme` block, imported by each app's `src/styles/global.css`. They surface as Tailwind utilities (`bg-canvas`, `text-ink`, etc.). There is no `tailwind.config.*` — Tailwind v4 runs via the `@tailwindcss/vite` plugin.

`apps/glasses/src/layouts/Layout.astro` locks the 600×600 `.canvas`, disables scroll, and sets `<meta name="mrbd-web-app-capable">`. Above a 601px viewport it draws a centered preview frame so the device layout is reviewable on a desktop browser.

## Interaction model

The Display has no pointer — navigation is D-pad/focus based. `apps/glasses/src/pages/index.astro` is the reference: mark focusable elements with the **`data-focusable` attribute**, and the inline script moves focus on Arrow keys and activates on Enter. Keep focus targets large (≥88px min-height) and rely on `:focus-visible` for the accent ring.

**Convention — use `[data-focusable]`, not `.focusable`.** Meta's own docs/samples use a `.focusable` *class*; this project deliberately uses the `data-focusable` *attribute* instead (keeps the behavior hook off the styling namespace). When copying Meta sample code or AI-generated snippets, translate `.focusable` → `data-focusable`. Don't switch the codebase to match the docs.

**The device reliably emits only `ArrowUp/Down/Left/Right` + `Enter`** (confirmed on-device). There is **no dependable `Escape`/Back gesture** — Meta's sample maps `Escape→history.back()`, but back-nav is unsupported *and* no gesture produces Escape. So every action must be reachable by moving focus (arrows) to a `[data-focusable]` control and activating it (Enter). Never gate an action behind Escape — e.g. a paused screen needs a focusable "Stop" button, not an `Escape` handler.

**Lens architecture (deep modules).** Keep lens *logic* DOM-free in `apps/glasses/src/lib/*.ts` (pure classes/functions — e.g. the tracker's `Tracker` state machine + `SpeedKalman` filter). The **view** is a Solid component in `src/components/*.tsx` (inline Tailwind, reactive), hosted as a `client:load` island from the lens's `.astro` page; it subscribes to the logic via a `snapshot()` signal and holds no domain logic. Keeps lenses testable and the logic promotable to a shared package once a 2nd lens needs it. Reference: `src/pages/speedometer/_README.md`.

**Shared glasses UI.** Reusable focus-nav lives in `apps/glasses/src/lib/dpad.ts` (`focusFirst` / `handleListNav`); shared CSS primitives (`.opt` button + focus ring, `.title`, `.hint`, `.stat`, …) live in `@lenswolf/ui/glasses.css` (imported by `apps/glasses/src/styles/global.css` after `theme.css`). Lenses use these semantic classes + Tailwind utilities for one-offs; keep `[data-state]` styling in the lens `<style>`. Don't re-declare a primitive locally — add it to `glasses.css`.

## Dev on real hardware

`apps/glasses/astro.config.mjs` allowlists `*.ngrok-free.app` / `*.ngrok.app` and pins HMR `clientPort: 443` — run `pnpm dev` and expose it through an ngrok tunnel to load the app on the actual glasses with working hot reload.

## Tooling notes

- Always use pnpm (workspaces). Lint is **oxlint**, not eslint.
- `pnpm-workspace.yaml` sets `allowBuilds` (esbuild/sharp off) and uses `minimumReleaseAgeExclude` to allow a few fresh packages (`astro@7.0.0`, `@astrojs/react@6.0.0`) through the min-release-age delay. Both apps run **Astro 7** (Vite 8 / Rolldown / Oxc) — keep them on the same major.
- **File naming:** PascalCase for component/layout files that export a component (`Speedometer.tsx`, `Layout.astro`); kebab/lowercase for logic, utils, and CSS (`tracker.ts`, `glasses.css`); lowercase for Astro pages (they map to URLs). Exception: shadcn `components/ui/*` stay lowercase (`button.tsx`) — the CLI regenerates them that way, don't rename.
