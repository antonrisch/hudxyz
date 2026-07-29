# PRD: App submit flow

**Status:** Planned  
**Owner:** apps/web  
**Depends on:** Create draft app API, R2 asset APIs, category seed  
**Related:** Directory PRD (consumes `published` apps)

## Problem

Developers need a way to list an MRBD (and later other) web app on hudxyz.com: metadata + icon + screenshots + optional preview video, then request review.

Today: mailto directory request only; no structured submission.

## Goal

A web form where a user creates/edits a **draft**, uploads media to R2, and submits for review (`pending`).

## Non-goals

- Full auth (v1 may be open or gated by secret; Better Auth later)
- Admin review UI (can use DB/Turso/studio or a tiny internal route later)
- ffmpeg normalize pipeline (see root `AGENTS.md` Deferred)
- Multi-device catalog beyond `targetDevice` string
- Payments, ranking, comments

## User flow

1. Open `/apps/submit` (or `/submit`)
2. Enter name, slug, launch URL, listing type, categories, description
3. Save draft → `POST /api/apps` (or update existing)
4. Upload **icon** (required to submit), up to **10 screenshots**, optional **1 preview** (`video/mp4`)
5. Client: presign → PUT to R2 → register asset (send `width`/`height`/`durationMs` when known)
6. Submit for review → status `draft` → `pending`, set `submittedAt`
7. Confirmation screen (“we’ll review”)

## Media rules (v1)

| Kind       | Max         | Format        | Notes                                              |
| ---------- | ----------- | ------------- | -------------------------------------------------- |
| icon       | 1 (replace) | jpeg/png/webp | Required before submit                             |
| screenshot | 10          | jpeg/png/webp | Ordered; at least 1 recommended                    |
| preview    | 1 (replace) | `video/mp4`   | Optional; 5–30s, ≤50MB, ≤1920px edge when reported |

Storage: Cloudflare R2; keys via `lib/apps/asset-keys.ts`; public host `R2_PUBLIC_BASE_URL`.

## API additions

- `POST /api/apps/[id]/submit` — validates required fields + icon present; sets `pending`
- Reuse existing asset routes

## UI

- One page, progressive: details → media → submit
- Use existing shadcn form controls; keep layout simple (not a dashboard)
- Show upload progress / errors per file
- Deep-link simulator: “Preview in simulator” using `launchUrl`

## Acceptance

- [ ] Happy path: draft → uploads → pending
- [ ] Cannot submit without name, slug, launchUrl, categories, icon
- [ ] Screenshot cap and single preview enforced
- [ ] Failed R2 PUT does not leave a registered DB row (register only after PUT succeeds)
- [ ] Works against dev bucket (`assets-dev` / env) and prod bucket via env only

## Deferred

- Auth + “my submissions”
- Server-side ffprobe/ffmpeg (AGENTS.md)
- Admin approve → `published`
