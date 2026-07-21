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
  beginLoadAttempt,
  mintLoadId,
  trackLoadFailed,
  trackLoadRequested,
  trackLoadSucceeded,
} from "./load-attempt";
import {
  sanitizeAnalyticsPath,
  sanitizeAnalyticsProperties,
  sanitizeAnalyticsUrl,
  stripDeniedAnalyticsProperties,
} from "./sanitize";
import { consumeCatalogSimulatorLoad, markNextSimulatorLoadAsCatalog } from "./simulator-source";
import {
  bindAnalyticsCapture,
  flushPendingAnalyticsEvents,
  getPendingAnalyticsEventCountForTests,
  resetAnalyticsTrackForTests,
  track,
  trackOnce,
} from "./track";
import { settledMeasurementConsent } from "../consent/config";

function withSessionStorage(run: (store: Map<string, string>) => void) {
  const store = new Map<string, string>();
  const previousSessionStorage = globalThis.sessionStorage;
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    },
  });
  try {
    run(store);
  } finally {
    if (previousSessionStorage === undefined) {
      Reflect.deleteProperty(globalThis, "sessionStorage");
    } else {
      Object.defineProperty(globalThis, "sessionStorage", {
        configurable: true,
        value: previousSessionStorage,
      });
    }
  }
}

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

  it("preserves $utm_* acquisition properties while stripping URL query strings", () => {
    const sanitized = sanitizeAnalyticsProperties({
      $current_url: "https://hudxyz.com/hubs?utm_source=reddit&utm_campaign=week1",
      $utm_source: "reddit",
      $utm_medium: "social",
      $utm_campaign: "week1",
    });
    assert.equal(sanitized.$current_url, "https://hudxyz.com/hubs");
    assert.equal(sanitized.$pathname, "/hubs");
    assert.equal(sanitized.$utm_source, "reddit");
    assert.equal(sanitized.$utm_medium, "social");
    assert.equal(sanitized.$utm_campaign, "week1");
  });

  it("strips denylisted and URL-shaped custom properties", () => {
    const sanitized = stripDeniedAnalyticsProperties({
      public_id: "ABC123",
      url: "https://app.example",
      hostname: "app.example",
      query: "secret=1",
      app_name: "Secret",
      deep_link: "fb-viewapp://x",
      file_name: "photo.jpg",
      href: "https://evil.example",
      nested: {
        launchUrl: "https://nested.example",
        ok: true,
        host: "//cdn.example/x",
      },
      referrer_like: "app.example/path",
      protocol_relative: "//evil.example/x",
      has_url: true,
      ok: true,
      background: "alps",
    });
    assert.deepEqual(sanitized, {
      public_id: "ABC123",
      nested: { ok: true },
      has_url: true,
      ok: true,
      background: "alps",
    });
  });
});

describe("catalog simulator load marker", () => {
  it("marks and consumes a directory Try with publicId within the TTL", () => {
    withSessionStorage(() => {
      assert.equal(consumeCatalogSimulatorLoad(), null);
      markNextSimulatorLoadAsCatalog("HUBPUBID01");
      assert.deepEqual(consumeCatalogSimulatorLoad(), { publicId: "HUBPUBID01" });
      assert.equal(consumeCatalogSimulatorLoad(), null);
    });
  });

  it("rejects stale, future, empty, and legacy timestamp markers", () => {
    withSessionStorage((store) => {
      store.set("hud:analytics:catalog-load", String(Date.now() - 60_000));
      assert.equal(consumeCatalogSimulatorLoad(), null);

      // Legacy timestamp-only markers must not become catalog without publicId.
      store.set("hud:analytics:catalog-load", String(Date.now()));
      assert.equal(consumeCatalogSimulatorLoad(), null);

      store.set(
        "hud:analytics:catalog-load",
        JSON.stringify({ publicId: "FUTURE001", timestamp: Date.now() + 60_000 }),
      );
      assert.equal(consumeCatalogSimulatorLoad(), null);

      store.set(
        "hud:analytics:catalog-load",
        JSON.stringify({ publicId: "   ", timestamp: Date.now() }),
      );
      assert.equal(consumeCatalogSimulatorLoad(), null);

      markNextSimulatorLoadAsCatalog("");
      assert.equal(consumeCatalogSimulatorLoad(), null);
    });
  });
});

describe("load attempt correlation", () => {
  it("mints opaque ids and attaches catalog public_id only from the marker", () => {
    withSessionStorage(() => {
      const custom = beginLoadAttempt({ trigger: "typed" });
      assert.equal(custom.source, "custom");
      assert.equal(custom.trigger, "typed");
      assert.equal(custom.public_id, undefined);
      assert.ok(custom.load_id.length > 8);

      markNextSimulatorLoadAsCatalog("CATALOG001");
      const catalog = beginLoadAttempt({ isSeed: true });
      assert.equal(catalog.source, "catalog");
      assert.equal(catalog.trigger, "seed");
      assert.equal(catalog.public_id, "CATALOG001");
      assert.notEqual(catalog.load_id, custom.load_id);
    });
  });

  it("emits a single terminal outcome per attempt", () => {
    resetAnalyticsIdentityForTests();
    resetAnalyticsTrackForTests();
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test";
    setAnalyticsIdentityMode("persistent");

    const captured: Array<{ event: string; properties: Record<string, unknown> }> = [];
    bindAnalyticsCapture((event, properties) => {
      captured.push({ event, properties: properties as Record<string, unknown> });
    });

    const attempt = beginLoadAttempt({ trigger: "reload" });
    trackLoadRequested(attempt);
    trackLoadSucceeded(attempt);
    trackLoadSucceeded(attempt);
    trackLoadFailed(attempt, "timeout");

    assert.equal(captured.length, 2);
    assert.equal(captured[0]?.event, "simulator_load_requested");
    assert.equal(captured[1]?.event, "simulator_load_succeeded");
    assert.equal(captured[0]?.properties.load_id, attempt.load_id);
    assert.equal(captured[1]?.properties.load_id, attempt.load_id);
    assert.equal(typeof captured[1]?.properties.duration_ms, "number");
    assert.ok(mintLoadId() !== mintLoadId());
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

  it("queues product events until consent resolves, then flushes in order", () => {
    resetAnalyticsIdentityForTests();
    resetAnalyticsTrackForTests();
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test";

    const captured: Array<{ event: string; properties: unknown }> = [];
    bindAnalyticsCapture((event, properties) => {
      captured.push({ event, properties });
    });

    track("hub_try_clicked", { public_id: "TEST" });
    track("open_on_glasses_opened", { has_url: true, app_name_prefilled: false });
    assert.equal(captured.length, 0);
    assert.equal(getPendingAnalyticsEventCountForTests(), 2);

    setAnalyticsIdentityMode("persistent");
    flushPendingAnalyticsEvents();
    assert.equal(captured.length, 2);
    assert.equal(captured[0]?.event, "hub_try_clicked");
    assert.equal(captured[1]?.event, "open_on_glasses_opened");
    assert.equal(getPendingAnalyticsEventCountForTests(), 0);

    track("hub_try_clicked", { public_id: "TEST2" });
    assert.equal(captured.length, 3);
  });

  it("bounds the pre-consent queue and lets trackOnce retry after eviction", () => {
    resetAnalyticsIdentityForTests();
    resetAnalyticsTrackForTests();
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test";

    const captured: string[] = [];
    bindAnalyticsCapture((event) => {
      captured.push(event);
    });

    trackOnce("once-cap", "screen_record_capability", { supported: true });
    for (let i = 0; i < 32; i += 1) {
      track("hub_try_clicked", { public_id: `P${i}` });
    }
    assert.equal(getPendingAnalyticsEventCountForTests(), 32);

    // Evicted once-key can fire again.
    trackOnce("once-cap", "screen_record_capability", { supported: false });
    assert.equal(getPendingAnalyticsEventCountForTests(), 32);

    setAnalyticsIdentityMode("persistent");
    flushPendingAnalyticsEvents();
    assert.ok(captured.includes("screen_record_capability"));
    assert.equal(captured.filter((e) => e === "screen_record_capability").length, 1);
    assert.equal(captured[captured.length - 1], "screen_record_capability");
  });

  it("drops events when PostHog is disabled", () => {
    resetAnalyticsIdentityForTests();
    resetAnalyticsTrackForTests();
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;

    const captured: Array<{ event: string }> = [];
    bindAnalyticsCapture((event) => {
      captured.push({ event });
    });

    setAnalyticsIdentityMode("persistent");
    track("hub_try_clicked", { public_id: "TEST" });
    assert.equal(captured.length, 0);
    assert.equal(getPendingAnalyticsEventCountForTests(), 0);
  });

  it("trackOnce fires only once per key", () => {
    resetAnalyticsIdentityForTests();
    resetAnalyticsTrackForTests();
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test";
    setAnalyticsIdentityMode("cookieless");

    const captured: string[] = [];
    bindAnalyticsCapture((event) => {
      captured.push(event);
    });

    trackOnce("screen_record_capability", "screen_record_capability", { supported: true });
    trackOnce("screen_record_capability", "screen_record_capability", { supported: false });
    assert.deepEqual(captured, ["screen_record_capability"]);
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
