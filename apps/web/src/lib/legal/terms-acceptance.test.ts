import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { legal } from "./config";
import { submitTermsAcceptanceSchema } from "./terms-acceptance";

describe("terms acceptance", () => {
  it("requires an explicit acceptance of the current Terms version", () => {
    const current = submitTermsAcceptanceSchema.parse({
      termsVersion: legal.termsVersion,
      termsAccepted: true,
    });
    assert.equal(current.termsVersion, legal.termsVersion);

    assert.equal(
      submitTermsAcceptanceSchema.safeParse({
        termsVersion: "1970-01-01",
        termsAccepted: true,
      }).success,
      false,
    );
  });

  it("rejects missing or false acceptance", () => {
    assert.equal(submitTermsAcceptanceSchema.safeParse({}).success, false);
    assert.equal(
      submitTermsAcceptanceSchema.safeParse({
        termsVersion: legal.termsVersion,
        termsAccepted: false,
      }).success,
      false,
    );
  });
});
