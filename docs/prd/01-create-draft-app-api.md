# PRD: Create draft app API

**Status:** Next  
**Owner:** apps/web  
**Depends on:** Turso schema (`apps`, `categories`), seeded categories  
**Unblocks:** Asset upload E2E, submit UI

## Problem

Asset APIs (`POST /api/apps/assets/presign`, register, delete) require a real `appId`. There is no way to create an `apps` row from the product yet.

## Goal

Minimal HTTP API to create and update **draft** listings so uploads and the submit form can attach media to an app.

## Non-goals

- Auth / ownership (no Better Auth yet)
- Public submit UI (separate PRD)
- Review / publish workflow UI
- Soft-delete, versioning, or slug history

## Requirements

### Create draft

- `POST /api/apps`
- Body: `name`, `slug`, `launchUrl`, `listingType` (`app` | `game`), `primaryCategoryId`, optional `description`, optional `secondaryCategoryId`, optional `targetDevice` (default `mrbd`)
- Creates row with `status = draft`
- Validates slug uniqueness, category exists and matches `listingType`
- Returns full app JSON including `id`

### Update draft

- `PATCH /api/apps/[id]`
- Only when `status` is `draft` (or `rejected` if we allow resubmit later — v1: **draft only**)
- Same fields as create (partial)
- Returns updated app

### Read (optional but useful)

- `GET /api/apps/[id]` — any status, for form hydration
- No list endpoint in this PRD (directory PRD owns public list)

## Acceptance

- [ ] Can create a draft and receive `id`
- [ ] Invalid category / duplicate slug → 4xx with clear error
- [ ] Presign works against the new `id`
- [ ] No auth required (document as temporary)

## Out of scope follow-ups

- `editToken` or session ownership before public internet exposure
- `POST /api/apps/[id]/submit` → `pending` (belongs with submit PRD)
