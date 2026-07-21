import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  hasEmittedInitialAnalyticsPageview,
  resetPostHogClientForTests,
  syncPostHogMeasurementConsent,
} from "./client";
import { enrichAnalyticsProperties } from "./enrich";
import {
  getAnalyticsIdentityMode,
  identityModeFromMeasurementConsent,
  isAnalyticsConsentResolved,
  resetAnalyticsIdentityForTests,
  setAnalyticsIdentityMode,
} from "./identity";
import {
  sanitizeAnalyticsPath,
  sanitizeAnalyticsProperties,
  sanitizeAnalyticsUrl,
} from "./sanitize";
import { bindAnalyticsCapture, resetAnalyticsTrackForTests, track } from "./track";
import { settledMeasurementConsent } from "../consent/config";

describe("analytics sanitize", () => {
  it("strips query strings and hashes from URLs", () => {
    const origin = "https://hudxyz.com";
    assert.equal(
      sanitizeAnalyticsUrl(
        "https://hudxyz.com/simulator?url=https://evil.example&q=secret#x",
        origin,
      ),
      "https://hudxyz.com/simulator",
    );
    assert.equal(
      sanitizeAnalyticsPath("/hubs/submit?id=ABC123&email=a%40b.com", origin),
      "/hubs/submit",
    );
  });

  it("sanitizes automatic PostHog URL properties", () => {
    const sanitized = sanitizeAnalyticsProperties({
      $current_url: "https://hudxyz.com/hubs?q=hidden",
      $referrer: "https://google.com/search?q=hud",
      keep: "ok",
    });
    assert.equal(sanitized.$current_url, "https://hudxyz.com/hubs");
    assert.equal(sanitized.$pathname, "/hubs");
    assert.equal(sanitized.$referrer, "https://google.com/search");
    assert.equal(sanitized.keep, "ok");
  });
});

describe("analytics identity and enrichment", () => {
  it("maps measurement consent to identity mode", () => {
    assert.equal(identityModeFromMeasurementConsent(true), "persistent");
    assert.equal(identityModeFromMeasurementConsent(false), "cookieless");
  });

  it("stays unresolved until consent settles", () => {
    resetAnalyticsIdentityForTests();
    assert.equal(isAnalyticsConsentResolved(), false);
    assert.equal(getAnalyticsIdentityMode(), "cookieless");

    setAnalyticsIdentityMode("persistent");
    assert.equal(isAnalyticsConsentResolved(), true);
    assert.equal(getAnalyticsIdentityMode(), "persistent");
  });

  it("enriches events centrally with analytics_identity_mode", () => {
    resetAnalyticsIdentityForTests();
    setAnalyticsIdentityMode("cookieless");
    const cookieless = enrichAnalyticsProperties({
      $current_url: "https://hudxyz.com/simulator?url=https://app.example",
    });
    assert.equal(cookieless.analytics_identity_mode, "cookieless");
    assert.equal(cookieless.$current_url, "https://hudxyz.com/simulator");

    setAnalyticsIdentityMode("persistent");
    const persistent = enrichAnalyticsProperties({});
    assert.equal(persistent.analytics_identity_mode, "persistent");
  });
});

describe("analytics consent gating", () => {
  it("ignores c15t placeholder consent until policy resolution", () => {
    assert.equal(settledMeasurementConsent(false, false), undefined);
    assert.equal(settledMeasurementConsent(true, false), false);
    assert.equal(settledMeasurementConsent(true, true), true);
  });

  it("does not capture custom events before consent resolves", () => {
    resetAnalyticsIdentityForTests();
    resetAnalyticsTrackForTests();
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test";

    const captured: Array<{ event: string; properties: unknown }> = [];
    bindAnalyticsCapture((event, properties) => {
      captured.push({ event, properties });
    });

    track("submission_completed", {
      public_id: "TEST",
    });
    assert.equal(captured.length, 0);

    setAnalyticsIdentityMode("persistent");
    track("submission_completed", {
      public_id: "TEST",
    });
    assert.equal(captured.length, 1);
    assert.equal(captured[0]?.event, "submission_completed");
  });

  it("emits the deferred initial pageview only once when consent syncs", () => {
    resetAnalyticsIdentityForTests();
    resetPostHogClientForTests();
    // Without a key, init stays false and sync still settles identity + pageview gate.
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;

    // syncPostHogMeasurementConsent is browser-only; exercise the gate helpers directly.
    assert.equal(typeof syncPostHogMeasurementConsent, "function");
    assert.equal(hasEmittedInitialAnalyticsPageview(), false);

    // Simulate the gate that syncPostHogMeasurementConsent sets after consent settles.
    setAnalyticsIdentityMode("cookieless");
    resetPostHogClientForTests();
    // Call sync in a fake browser environment.
    const previousWindow = globalThis.window;
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { location: { href: "https://hudxyz.com/hubs?q=secret" } },
    });
    try {
      syncPostHogMeasurementConsent(false);
      assert.equal(isAnalyticsConsentResolved(), true);
      assert.equal(getAnalyticsIdentityMode(), "cookieless");
      assert.equal(hasEmittedInitialAnalyticsPageview(), true);

      syncPostHogMeasurementConsent(true);
      assert.equal(getAnalyticsIdentityMode(), "persistent");
      assert.equal(hasEmittedInitialAnalyticsPageview(), true);
    } finally {
      if (previousWindow === undefined) {
        Reflect.deleteProperty(globalThis, "window");
      } else {
        Object.defineProperty(globalThis, "window", {
          configurable: true,
          value: previousWindow,
        });
      }
    }
  });
});
