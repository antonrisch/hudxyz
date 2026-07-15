import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";

import { sql } from "drizzle-orm";

import { getDb } from "@/db";
import { deleteDraftAsset, saveDraftAsset } from "@/lib/apps/assets";
import { DraftConflictError } from "@/lib/apps/draft";

const appId = "test-draft";
const databasePath = join(tmpdir(), `hudxyz-draft-assets-${randomUUID()}.db`);

before(async () => {
  process.env.TURSO_CONNECTION_URL = `file:${databasePath}`;
  process.env.TURSO_AUTH_TOKEN = "test";
  const db = getDb();
  await db.run(sql`
    create table apps (
      id text primary key,
      status text not null
    )
  `);
  await db.run(sql`
    create table app_assets (
      id text primary key,
      app_id text not null,
      kind text not null,
      object_key text not null,
      sort_order integer not null default 0,
      width integer,
      height integer,
      duration_ms integer,
      created_at integer
    )
  `);
  await db.run(sql`insert into apps (id, status) values (${appId}, 'draft')`);
});

after(() => rm(databasePath, { force: true }));

describe("public draft asset lifecycle", () => {
  it("registers media only while the app remains a draft", async () => {
    const asset = await saveDraftAsset({
      appId,
      kind: "icon",
      objectKey: `${appId}/icon.png`,
    });
    assert.equal(asset.appId, appId);

    const db = getDb();
    await db.run(sql`update apps set status = 'pending' where id = ${appId}`);

    await assert.rejects(
      saveDraftAsset({
        appId,
        kind: "icon",
        objectKey: `${appId}/replacement.png`,
      }),
      DraftConflictError,
    );
    await assert.rejects(deleteDraftAsset(asset.id, appId), DraftConflictError);
  });
});
