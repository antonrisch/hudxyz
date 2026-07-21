import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  beginLoadAttempt,
  trackLoadFailed,
  trackLoadRequested,
  trackLoadSucceeded,
} from "./load-attempt";
import { resetAnalyticsIdentityForTests, setAnalyticsIdentityMode } from "./identity";
import { bindAnalyticsCapture, resetAnalyticsTrackForTests, track } from "./track";
import { markNextSimulatorLoadAsCatalog } from "./simulator-source";

function withSessionStorage(run: () => void) {
  const store = new Map<string, string>();
  const previous = globalThis.sessionStorage;
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
    run();
  } finally {
    if (previous === undefined) Reflect.deleteProperty(globalThis, "sessionStorage");
    else
      Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: previous });
  }
}

describe("simulator load analytics helpers", () => {
  it("correlates request → success with duration and catalog public_id", () => {
    withSessionStorage(() => {
      resetAnalyticsIdentityForTests();
      resetAnalyticsTrackForTests();
      process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test";
      setAnalyticsIdentityMode("persistent");

      const captured: Array<{ event: string; properties: Record<string, unknown> }> = [];
      bindAnalyticsCapture((event, properties) => {
        captured.push({ event, properties: properties as Record<string, unknown> });
      });

      markNextSimulatorLoadAsCatalog("PUBID00001");
      const attempt = beginLoadAttempt({ isSeed: true });
      trackLoadRequested(attempt);
      trackLoadSucceeded(attempt);

      assert.equal(captured.length, 2);
      assert.equal(captured[0]?.properties.source, "catalog");
      assert.equal(captured[0]?.properties.trigger, "seed");
      assert.equal(captured[0]?.properties.public_id, "PUBID00001");
      assert.equal(captured[1]?.properties.load_id, captured[0]?.properties.load_id);
      assert.ok((captured[1]?.properties.duration_ms as number) >= 0);
    });
  });

  it("keeps matching URLs custom without a directory marker", () => {
    withSessionStorage(() => {
      const attempt = beginLoadAttempt({ trigger: "popular" });
      assert.equal(attempt.source, "custom");
      assert.equal(attempt.public_id, undefined);
      assert.equal(attempt.trigger, "popular");
    });
  });

  it("classifies aborted navigation as a terminal failure without duplicates", () => {
    resetAnalyticsIdentityForTests();
    resetAnalyticsTrackForTests();
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test";
    setAnalyticsIdentityMode("cookieless");

    const captured: string[] = [];
    bindAnalyticsCapture((event) => {
      captured.push(event);
    });

    const attempt = beginLoadAttempt({ trigger: "typed" });
    trackLoadRequested(attempt);
    trackLoadFailed(attempt, "navigation_aborted");
    trackLoadFailed(attempt, "timeout");

    assert.deepEqual(captured, ["simulator_load_requested", "simulator_load_failed"]);
  });

  it("strips accidental URL props on workflow events", () => {
    resetAnalyticsIdentityForTests();
    resetAnalyticsTrackForTests();
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test";
    setAnalyticsIdentityMode("persistent");

    const captured: Array<Record<string, unknown>> = [];
    bindAnalyticsCapture((_event, properties) => {
      captured.push(properties as Record<string, unknown>);
    });

    track("background_selected", { background: "alps", url: "https://should.not.leak" } as {
      background: "alps";
    });

    assert.deepEqual(captured[0], { background: "alps" });
  });
});
