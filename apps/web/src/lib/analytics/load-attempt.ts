import type {
  SimulatorLoadFailureStage,
  SimulatorLoadSource,
  SimulatorLoadTrigger,
} from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import { consumeCatalogSimulatorLoad } from "@/lib/analytics/simulator-source";

export type SimulatorLoadAttempt = {
  load_id: string;
  source: SimulatorLoadSource;
  trigger: SimulatorLoadTrigger;
  public_id?: string;
  startedAt: number;
  terminalEmitted: boolean;
};

export type BeginLoadAttemptInput = {
  /** Explicit trigger from the interaction that started the attempt. */
  trigger?: SimulatorLoadTrigger;
  /** True when this navigation is the first seed load from `?url=`. */
  isSeed?: boolean;
};

/** Opaque per-attempt id — never derived from the target URL. */
export function mintLoadId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `load_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function resolveTrigger(input: BeginLoadAttemptInput): SimulatorLoadTrigger {
  if (input.trigger) return input.trigger;
  if (input.isSeed) return "seed";
  return "typed";
}

/**
 * Mint load correlation + resolve catalog attribution.
 * Catalog `source` / `public_id` only come from a consumed directory Try marker.
 */
export function beginLoadAttempt(input: BeginLoadAttemptInput = {}): SimulatorLoadAttempt {
  const catalog = consumeCatalogSimulatorLoad();
  const source: SimulatorLoadSource = catalog ? "catalog" : "custom";
  const public_id = catalog?.publicId;

  return {
    load_id: mintLoadId(),
    source,
    trigger: resolveTrigger(input),
    ...(public_id ? { public_id } : {}),
    startedAt: performance.now(),
    terminalEmitted: false,
  };
}

function baseProps(attempt: SimulatorLoadAttempt) {
  return {
    load_id: attempt.load_id,
    source: attempt.source,
    trigger: attempt.trigger,
    ...(attempt.public_id ? { public_id: attempt.public_id } : {}),
  };
}

export function trackLoadRequested(attempt: SimulatorLoadAttempt): void {
  track("simulator_load_requested", baseProps(attempt));
}

export function trackLoadSucceeded(attempt: SimulatorLoadAttempt): void {
  if (attempt.terminalEmitted) return;
  attempt.terminalEmitted = true;
  track("simulator_load_succeeded", {
    ...baseProps(attempt),
    duration_ms: Math.max(0, Math.round(performance.now() - attempt.startedAt)),
  });
}

export function trackLoadFailed(
  attempt: SimulatorLoadAttempt,
  failure_stage: SimulatorLoadFailureStage,
): void {
  if (attempt.terminalEmitted) return;
  attempt.terminalEmitted = true;
  track("simulator_load_failed", {
    ...baseProps(attempt),
    duration_ms: Math.max(0, Math.round(performance.now() - attempt.startedAt)),
    failure_stage,
  });
}
