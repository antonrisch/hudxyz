# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repo.

## What this is

A browser-based **emulator for the Meta Ray-Ban Display** (MRBD) — a monocular waveguide smart-glasses screen. The emulator loads real MRBD web apps in a faithful **600×600** surface on an ordinary desktop browser and drives them with the glasses' D-pad input model, so MRBD apps can be built and previewed without the hardware.

Single Next.js app in **`apps/web`**. pnpm monorepo, Next.js 16 (App Router) + React 19 + Tailwind v4, shadcn/ui on Base UI primitives. Node >= 22.12.

## The MRBD target

The emulator reproduces the two things that make the device different from a normal web page:

- **600×600 fixed viewport** — the waveguide surface.
- **D-pad input** — the device emits `ArrowUp` / `ArrowDown` / `ArrowLeft` / `ArrowRight` + `Enter`, with no pointer. Every action is reached by moving focus to a control and pressing Enter.

(The physical display is additive — white reads opaque, black reads transparent — so MRBD apps are designed white-on-black.)

## The emulator

Two routes render the same `Emulator` component (`components/Emulator.tsx`, via a `chrome` prop):

- **`/emulator`** — the display embedded in the right lens of a glasses-frame SVG (`components/frames.tsx`).
- **`/browser`** — a bare 600×600 box for debugging without the frame.

**Same-origin proxy.** Third-party sites set `frame-ancestors` / `X-Frame-Options` that scope framing to themselves. The emulator re-serves the target **from our own origin** through a **Scramjet v2** service-worker proxy, so the browser treats it as same-origin and renders it. Same-origin also lets the D-pad inject keystrokes straight into the frame.

Request path: `frame.go(url)` points the iframe at a same-origin proxied URL → the service worker (`public/sw.js`) routes it through Scramjet → the engine fetches the real site through a **Wisp** egress server → the response (and every URL/script inside it) is rewritten back through the proxy and rendered.

Key files:

- `lib/proxy.ts` — boots the Scramjet v2 controller, registers the SW, wires the libcurl/Wisp transport, and exposes `createFrame(iframe)`.
- `public/sw.js` — the Scramjet v2 service worker; routes proxied requests and stamps COEP/CORP so the cross-origin-isolated host can embed them.
- `scripts/copy-proxy-assets.mjs` — copies the Scramjet engine + controller bundles into `/public/scramjet` and `/public/controller` (runs on install/dev/build).
- `scripts/wisp-server.mjs` — the dev Wisp egress server on `:4000`.
- `next.config.ts` — sets COOP/COEP on `/emulator` + `/browser` (for Scramjet's wasm) and `Service-Worker-Allowed: /` on `/sw.js`.

**Stack pins:** Scramjet engine `2.0.67-alpha.2` (exact-pinned) + scramjet-controller `0.0.14` (the Controller/Frame API, which takes a ProxyTransport directly) + libcurl-transport `2.0.5` + wisp-js. The controller asserts the engine version at construction, so any version drift fails loudly. The v1 stack (Scramjet 1.1.0 + bare-mux + libcurl 1.5.2) lives on branch `feat/emulator-scramjet` as a stable-engine reference.

**Prod note:** Wisp wants a persistent WebSocket host, so production runs it on a dedicated always-on box with `NEXT_PUBLIC_WISP_URL` pointing at it. Egress originates from that host, so it carries SSRF protection (hostname blacklist + port restriction) for the public deployment.

## Layout (`apps/web`)

- `app/` — App Router routes: `page.tsx` (home), `emulator/page.tsx`, `browser/page.tsx`, `layout.tsx` (Inter + Geist Mono fonts, react-grab dev overlay), `globals.css` (shadcn theme tokens).
- `components/` — `Emulator.tsx`, `frames.tsx`, `theme-provider.tsx`, and `ui/*` (shadcn components; add with `pnpm dlx shadcn@latest add <name>`).
- `lib/` — `proxy.ts` (emulator proxy), `utils.ts`.
- `public/` — `sw.js` plus the generated `scramjet/` + `controller/` bundles.
- `scripts/` — `copy-proxy-assets.mjs`, `wisp-server.mjs`.

`apps/web/AGENTS.md` flags that this is **Next.js 16** with breaking changes — read `node_modules/next/dist/docs/` before writing Next code.

## Commands

```sh
pnpm dev          # web app: next dev + the wisp server (via concurrently)
pnpm build        # build all workspaces
pnpm lint         # oxlint over the repo
pnpm format       # oxfmt
```

Per-app: `pnpm --filter @hudbox/web <script>`. Type-check with `pnpm --filter @hudbox/web typecheck`.

## Tooling

- pnpm workspaces throughout. Lint is **oxlint**; format is **oxfmt**.
- `pnpm-workspace.yaml` scopes the workspace to `apps/*` and lists `allowBuilds` (esbuild / sharp / scramjet / bufferutil ship prebuilt, so they stay unbuilt).
- **File naming:** kebab-case / lowercase for every `.ts` / `.tsx` file, components included (`emulator.tsx`, `theme-provider.tsx`, `proxy.ts`); lowercase for App Router route files (`page.tsx`). Keeps imports stable on case-sensitive build hosts (Vercel/Linux) even though macOS is case-insensitive.
