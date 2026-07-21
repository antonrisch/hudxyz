import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { SuggestedHub } from "./config";
import { suggestedHubNameForUrl } from "./suggested-hubs";

const hubs: SuggestedHub[] = [
  { name: "Acme Hub", url: "https://acme.example.com/", iconUrl: "" },
  { name: "Docs Path", url: "https://docs.example.com/app", iconUrl: "" },
];

describe("suggestedHubNameForUrl", () => {
  it("matches the canonical suggested-hub URL", () => {
    assert.equal(suggestedHubNameForUrl("https://acme.example.com/", hubs), "Acme Hub");
  });

  it("matches http vs https scheme variants", () => {
    assert.equal(suggestedHubNameForUrl("http://acme.example.com/", hubs), "Acme Hub");
    assert.equal(suggestedHubNameForUrl("http://docs.example.com/app", hubs), "Docs Path");
  });

  it("matches trailing-slash pathname variants", () => {
    assert.equal(suggestedHubNameForUrl("https://acme.example.com", hubs), "Acme Hub");
    assert.equal(suggestedHubNameForUrl("https://docs.example.com/app/", hubs), "Docs Path");
  });

  it("matches scheme and trailing-slash together", () => {
    assert.equal(suggestedHubNameForUrl("http://docs.example.com/app/", hubs), "Docs Path");
  });

  it("returns empty when the URL is not a suggested hub", () => {
    assert.equal(suggestedHubNameForUrl("https://other.example.com/", hubs), "");
  });

  it("returns empty for invalid or blank input", () => {
    assert.equal(suggestedHubNameForUrl("", hubs), "");
    assert.equal(suggestedHubNameForUrl("not a url", hubs), "");
  });
});
