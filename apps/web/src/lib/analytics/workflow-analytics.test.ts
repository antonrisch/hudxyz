import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { finishScreenRecordAnalytics } from "./screen-record";
import { sanitizeAnalyticsUrl } from "./sanitize";
import { customBackgroundFailReason, CustomBackgroundError } from "../simulator/background-image";
import { bindAnalyticsCapture, resetAnalyticsTrackForTests, track, trackOnce } from "./track";
import { resetAnalyticsIdentityForTests, setAnalyticsIdentityMode } from "./identity";

describe("workflow analytics helpers", () => {
  it("emits glasses copy outcomes with safe booleans only", () => {
    resetAnalyticsIdentityForTests();
    resetAnalyticsTrackForTests();
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test";
    setAnalyticsIdentityMode("persistent");

    const captured: Array<{ event: string; properties: Record<string, unknown> }> = [];
    bindAnalyticsCapture((event, properties) => {
      captured.push({ event, properties: properties as Record<string, unknown> });
    });

    track("open_on_glasses_opened", { has_url: true, app_name_prefilled: true });
    track("device_setup_link_copied", { has_url: true });
    track("device_setup_link_copy_failed", { has_url: false });

    assert.deepEqual(
      captured.map((c) => c.event),
      ["open_on_glasses_opened", "device_setup_link_copied", "device_setup_link_copy_failed"],
    );
    for (const item of captured) {
      assert.equal("deep_link" in item.properties, false);
      assert.equal("app_name" in item.properties, false);
    }
  });

  it("dedupes view selection once per view key", () => {
    resetAnalyticsIdentityForTests();
    resetAnalyticsTrackForTests();
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test";
    setAnalyticsIdentityMode("cookieless");

    const captured: Array<Record<string, unknown>> = [];
    bindAnalyticsCapture((_event, properties) => {
      captured.push(properties as Record<string, unknown>);
    });

    trackOnce("simulator_view_selected:pixel", "simulator_view_selected", {
      from: "glasses",
      to: "pixel",
      surface: "panel",
    });
    trackOnce("simulator_view_selected:pixel", "simulator_view_selected", {
      from: "glasses",
      to: "pixel",
      surface: "mobile_toolbar",
    });
    trackOnce("simulator_view_selected:glasses", "simulator_view_selected", {
      from: "pixel",
      to: "glasses",
      surface: "panel",
    });

    assert.equal(captured.length, 2);
    assert.equal(captured[0]?.to, "pixel");
    assert.equal(captured[1]?.to, "glasses");
  });

  it("records additive toggles and safe background payloads", () => {
    resetAnalyticsIdentityForTests();
    resetAnalyticsTrackForTests();
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test";
    setAnalyticsIdentityMode("persistent");

    const captured: Array<{ event: string; properties: Record<string, unknown> }> = [];
    bindAnalyticsCapture((event, properties) => {
      captured.push({ event, properties: properties as Record<string, unknown> });
    });

    track("simulator_additive_changed", { additive: true });
    track("background_selected", { background: "beach" });
    track("custom_background_added", { custom_count: 1 });
    track("custom_background_removed", { custom_count: 0 });
    track("custom_background_failed", { reason: "size" });
    track("simulator_screenshot_completed", { trigger: "keyboard" });
    track("simulator_screenshot_failed", { trigger: "button" });

    assert.equal(captured[1]?.properties.background, "beach");
    assert.equal("file_name" in (captured[2]?.properties ?? {}), false);
    assert.equal(captured[4]?.properties.reason, "size");
    assert.equal(captured[5]?.properties.trigger, "keyboard");
  });

  it("marks screen record failed when the blob is missing or empty", () => {
    resetAnalyticsIdentityForTests();
    resetAnalyticsTrackForTests();
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test";
    setAnalyticsIdentityMode("persistent");

    const captured: Array<{ event: string; properties: Record<string, unknown> }> = [];
    bindAnalyticsCapture((event, properties) => {
      captured.push({ event, properties: properties as Record<string, unknown> });
    });

    finishScreenRecordAnalytics({
      blob: null,
      duration_ms: 1200,
      stop_reason: "manual",
    });
    finishScreenRecordAnalytics({
      blob: new Blob([]),
      duration_ms: 50,
      stop_reason: "max_duration",
    });

    assert.deepEqual(
      captured.map((c) => [c.event, c.properties.reason]),
      [
        ["screen_record_failed", "encode"],
        ["screen_record_failed", "encode"],
      ],
    );
  });

  it("classifies custom background failures by typed error reason", () => {
    assert.equal(
      customBackgroundFailReason(new CustomBackgroundError("type", "File must be an image")),
      "type",
    );
    assert.equal(customBackgroundFailReason(new Error("random")), "processing");
  });

  it("applies the same simulator URL sanitize used by Sentry and PostHog", () => {
    assert.equal(
      sanitizeAnalyticsUrl(
        "https://hudxyz.com/simulator?url=https://app.example&mode=glasses",
        "https://hudxyz.com",
      ),
      "https://hudxyz.com/simulator",
    );
  });
});
