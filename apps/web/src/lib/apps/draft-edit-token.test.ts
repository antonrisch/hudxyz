import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  draftEditCookieName,
  hashDraftEditToken,
  mintDraftEditToken,
  readDraftEditTokenFromCookieHeader,
  verifyDraftEditToken,
} from "./draft-edit-token";
import { isEditableDraft } from "./submit-guard";

describe("draft edit token", () => {
  it("hashes and verifies the minted token", async () => {
    const token = mintDraftEditToken();
    const hash = await hashDraftEditToken(token);
    assert.equal(await verifyDraftEditToken(hash, token), true);
    assert.equal(await verifyDraftEditToken(hash, "wrong-token"), false);
    assert.equal(await verifyDraftEditToken(null, token), false);
    assert.equal(await verifyDraftEditToken(hash, undefined), false);
  });

  it("reads only the matching draft cookie", () => {
    const publicId = "ABCDEFGH12";
    const token = "raw-token-value";
    const header = [
      "hud_submit_session=shared",
      `${draftEditCookieName(publicId)}=${encodeURIComponent(token)}`,
      "other=1",
    ].join("; ");

    assert.equal(readDraftEditTokenFromCookieHeader(header, publicId), token);
    assert.equal(readDraftEditTokenFromCookieHeader(header, "OTHERID001"), undefined);
    assert.equal(readDraftEditTokenFromCookieHeader(null, publicId), undefined);
  });

  it("allows mutations only while the listing is a draft", () => {
    assert.equal(isEditableDraft({ status: "draft" }), true);
    assert.equal(isEditableDraft({ status: "pending" }), false);
    assert.equal(isEditableDraft({ status: "published" }), false);
    assert.equal(isEditableDraft({ status: "rejected" }), false);
  });
});
