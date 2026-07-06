# AGENTS.md

Guidance for AI agents when working in this repo.

## What this is

A browser-based **simulator for the Meta Ray-Ban Display** (MRBD) — a monocular waveguide smart-glasses screen. The simulator loads real MRBD web apps in a faithful **600×600** surface on an ordinary desktop browser and drives them with the glasses' D-pad input model, so MRBD apps can be built and previewed without the hardware.

Single Next.js app in **`apps/web`**. pnpm monorepo, Next.js 16 (App Router) + React 19 + Tailwind v4, shadcn/ui on Base UI primitives. Node >= 22.12.

## The MRBD target

The simulator reproduces the two things that make the device different from a normal web page:

- **600×600 fixed viewport** — the waveguide surface.
- **D-pad input** — the device emits `ArrowUp` / `ArrowDown` / `ArrowLeft` / `ArrowRight` + `Enter`, with no pointer. Every action is reached by moving focus to a control and pressing Enter.

(The physical display is additive — white reads opaque, black reads transparent — so MRBD apps are designed white-on-black.)

## The simulator

A single route, **`/`**, renders the `Simulator` component (`components/simulator/`) as an SPA. A segmented control swaps the **cosmetic chrome** around one persistent device surface — the live iframe never re-mounts on a view switch, so the Scramjet frame stays attached and the proxied page keeps running:

- **Glasses** — the display embedded in the right lens of a glasses-frame SVG (`components/simulator/frames.tsx`).
- **1:1** — the surface at its exact 600×600 size, no scaling (`pixel` in `?mode=`).

Cosmetic chrome is `?mode=glasses|pixel` (url-only name; store field is `view`). Set client-side via nuqs, so switching never navigates. `?url=` deep-links a target.

**Structure.** A UI-agnostic core — `lib/simulator/store.ts` (a zustand state machine: `screen`, `view`, `url`, `status`) plus `config.ts` — drives a thin presentational shell in `components/simulator/`: `index.tsx` wires the proxy / input / url-sync behavior and provides the context; `background/` (backdrop + picker), `panel/` (sidebar, controls, view-switcher, zoom-controls), `header/` (app-header, url-bar, share, feedback), `input/` (dpad, screenshot), plus root `device`. The d-pad emits `Intent`s the shell routes by `screen` (keys inject into the proxied app only when `screen === "app"`). `screen` is the **baby MRBD OS** seam: `app` runs the proxied app, `settings` is a blurred control overlay over it, and `home` / `apps` are os screens (stubs) — all on the same persistent surface, so building out the OS is additive.

**Same-origin proxy.** Third-party sites set `frame-ancestors` / `X-Frame-Options` that scope framing to themselves. The simulator re-serves the target **from our own origin** through a **Scramjet v2** service-worker proxy, so the browser treats it as same-origin and renders it. Same-origin also lets the D-pad inject keystrokes straight into the frame.

Request path: `frame.go(url)` points the iframe at a same-origin proxied URL → the service worker (`public/sw.js`) routes it through Scramjet → the engine fetches the real site through a **Wisp** egress server → the response (and every URL/script inside it) is rewritten back through the proxy and rendered.

Key files:

- `lib/proxy.ts` — boots the Scramjet v2 controller, registers the SW, wires the libcurl/Wisp transport, and exposes `createFrame(iframe)`.
- `public/sw.js` — the Scramjet v2 service worker; routes proxied requests and stamps COEP/CORP so the cross-origin-isolated host can embed them.
- `scripts/copy-proxy-assets.mjs` — copies the Scramjet engine + controller bundles into `/public/scramjet` and `/public/controller` (runs on install/dev/build).
- `scripts/wisp-server.mjs` — the dev Wisp egress server on `:4000`.
- `next.config.ts` — sets COOP/COEP on `/` (for Scramjet's wasm) and `Service-Worker-Allowed: /` on `/sw.js`.

**Stack pins:** Scramjet engine `2.0.67-alpha.2` (exact-pinned) + scramjet-controller `0.0.14` (the Controller/Frame API, which takes a ProxyTransport directly) + libcurl-transport `2.0.5` + wisp-js. The controller asserts the engine version at construction, so any version drift fails loudly. The v1 stack (Scramjet 1.1.0 + bare-mux + libcurl 1.5.2) lives on branch `feat/emulator-scramjet` as a stable-engine reference.

**Prod note:** Wisp wants a persistent WebSocket host, so production runs it on a dedicated always-on box with `NEXT_PUBLIC_WISP_URL` pointing at it. Egress originates from that host, so it carries SSRF protection (hostname blacklist + port restriction) for the public deployment.

## Layout (`apps/web`)

- `app/` — App Router routes: `page.tsx` (simulator), `layout.tsx` (fonts, react-grab dev overlay), `globals.css` (shadcn theme tokens).
- `components/` — `simulator/*` (`index.tsx` shell + `background/` / `panel/` / `header/` / `input/` + `device`), `theme-provider.tsx`, `layout/logo.tsx`, and `ui/*` (shadcn components; add with `pnpm dlx shadcn@latest add <name>`).
- `lib/` — `proxy.ts` (Scramjet proxy), `simulator/*` (`store.ts` core state machine + `config.ts` + `background.ts`), `utils.ts`.
- `public/` — `sw.js` plus the generated `scramjet/` + `controller/` bundles.
- `scripts/` — `copy-proxy-assets.mjs`, `wisp-server.mjs`.

`apps/web/AGENTS.md` flags that this is **Next.js 16** with breaking changes — read `node_modules/next/dist/docs/` before writing Next code.

## Styling

Tailwind v4 + the shadcn theme tokens in `app/globals.css` (`@theme inline` maps `--color-*` to the `:root` values). Style with the **semantic tokens and shadcn defaults**, not hardcoded Tailwind colors:

- Surfaces, text, borders, accents: `bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary` — not `bg-white` / `border-black/15`.
- Brand accent lives in `--volt` (`#CEFF00`), exposed as `bg-volt` / `text-volt`. Add custom colors the same two-step way: raw value in `:root`, then `--color-<name>: var(--<name>)` in `@theme inline`.
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

## Existing `apps/web/AGENTS.md`

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->
