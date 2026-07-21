# PRD: MDX docs surface and public changelog

**Status:** Deferred  
**Owner:** apps/web (or future `apps/docs`)  
**Depends on:** Release promotion flow (`deploy/RELEASE.md`), Conventional Commits / Release Please  
**Unblocks:** Public `/changelog`, product docs for simulator / hubs / CLI  
**Reference:** [vercel-labs/portless](https://github.com/vercel-labs/portless) `apps/docs` (Next + `@next/mdx`, curated `changelog/page.mdx`)

## Problem

Builders need a customer-facing “what’s new” page and, over time, product docs. Root `CHANGELOG.md` is a Release Please developer log (commit-derived) and is the wrong tone and format for hudxyz.com. A TypeScript-inlined release list was considered and rejected in favor of an MDX content system.

## Goal

Ship an MDX-based docs/content pipeline modeled on Portless:

- Curated public changelog authored as MDX (version headings, prose highlights) — not auto-rendered from root `CHANGELOG.md`.
- Shared MDX component map (typography, code, links) via `@next/mdx`.
- Room to grow into broader docs (simulator, hubs, submit, future CLI) without a second content stack.

## Non-goals (this PRD)

- Implementing the docs app or `/changelog` in the current release-promotion PR
- Publishing the private monorepo as open source
- Auto-syncing Release Please output into the public changelog
- Docs chat / AI search (Portless extras — optional later)

## Proposed shape

Prefer one of these (decide at implementation time):

1. **In-app MDX** under `apps/web` — `@next/mdx`, `pageExtensions` includes `mdx`, routes like `src/app/(site)/changelog/page.mdx` and later `src/app/(docs)/…`.
2. **Separate `apps/docs`** (closer to Portless) — own Next app, own deploy or path rewrite from hudxyz.com.

Default lean: **(1)** until docs volume justifies splitting.

### Changelog content contract

- Path: `/changelog` (canonical, indexed).
- Authored MDX, newest versions first.
- Structure inspired by Portless: `## x.y.z` then grouped sections (`### Features`, `### Fixes`, …) with short bold lead-ins.
- Seed with **v0.1.0** catch-up notes when the page ships.
- Keep independent of root `CHANGELOG.md`; editors copy/curate highlights after a Release Please tag when the change is user-visible.

### Rendering

- `createMDX()` from `@next/mdx` + `mdx-components.tsx` mapping semantic HTML to site tokens (`text-foreground`, `text-muted-foreground`, etc.).
- Optional Shiki for fenced code once docs include CLI snippets.
- Sitemap + footer / legal-link discovery when the route exists.

## Requirements

- [ ] MDX pipeline wired (Next config + component map)
- [ ] Curated `/changelog` MDX page with v0.1.0+ entries
- [ ] Nav + sitemap inclusion
- [ ] Authoring notes in `AGENTS.md` / `deploy/RELEASE.md` (link from release checklist)
- [ ] Decide in-app vs `apps/docs` before large doc volume

## Success

Builders can read product-facing release notes on hudxyz.com that match the tone of a marketing changelog (e.g. cursor.com/changelog), while maintainers still use Release Please’s developer `CHANGELOG.md` and GitHub Releases.
