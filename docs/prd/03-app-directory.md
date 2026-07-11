# PRD: App directory

**Status:** Planned  
**Owner:** apps/web  
**Depends on:** Published apps in Turso (+ assets in R2)  
**Related:** Submit flow PRD; simulator `SUGGESTED_APPS` migration

## Problem

hudxyz.com should be a browsable directory of wearable smart-glasses web apps (MRBD-first), not only a simulator with a hardcoded suggested list.

## Goal

Public **list** and **detail** pages for `status = published` apps, with icon/screenshots/preview and a clear path into the simulator.

## Non-goals

- Submit/review UI (separate PRD)
- Search relevance / rankings / votes
- Editorial “Today” feed / shelves
- Multi-provider device taxonomy (keep `targetDevice` string)
- Replacing the simulator home chrome

## Routes

| Route          | Purpose                              |
| -------------- | ------------------------------------ |
| `/apps`        | Grid/list of published apps          |
| `/apps/[slug]` | Detail: metadata, media gallery, CTA |

Optional later: `/apps?type=game`, category filters.

## List page (`/apps`)

- Query: published apps, newest `publishedAt` first (v1)
- Card: icon (`publicUrl`), name, short description, listing type, primary category
- Click → detail
- Empty state if none published
- CTA: “Submit an app” → submit flow

## Detail page (`/apps/[slug]`)

- Name, description, categories, target device
- Icon + screenshot gallery (ordered by `sortOrder`)
- Optional preview `<video>` (MP4, controls; no autoplay with sound)
- Primary CTA: **Open in simulator** → `/?url=<launchUrl>` (encodeURIComponent)
- Secondary: external launch URL (new tab) if useful
- 404 if slug missing or not published

## Data

- Server Components / route handlers reading Turso via `getDb()`
- Join or second query for `app_assets`; build URLs with `publicUrl(objectKey)`
- Do not expose drafts/pending/rejected on public routes

## Migration from simulator

- Keep `SUGGESTED_APPS` until ≥N published apps exist, **or**
- Seed published rows for current suggested apps and point the simulator picker at `GET` published list (follow-up)

## Acceptance

- [ ] Only `published` apps appear
- [ ] Detail shows media from R2 custom domain
- [ ] Simulator CTA opens `/` with correct `?url=`
- [ ] `next/image` works for configured asset host(s) (`next.config.ts` remotePatterns)
- [ ] Basic responsive layout; no card soup in the hero of marketing pages if this sits under a larger site later

## Deferred

- Filters, search, sort popularity
- OG images per app
- “Try on glasses” deep links with mode/bg prefs
