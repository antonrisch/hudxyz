import { SpeedKalman } from "./kalman";
import { haversine } from "./geo";

export type Mode = "run" | "ride";
export type TrackerState = "menu" | "acquiring" | "active" | "paused" | "summary";

export interface TrackerSnapshot {
  state: TrackerState;
  mode: Mode;
  speedMs: number; // filtered current speed
  distanceM: number;
  elapsedMs: number; // moving (banked) time
  avgMs: number; // avg speed = distance / elapsed
  maxMs: number;
  secondaryIndex: number; // 0..3, highlighted secondary stat
  accuracyM: number | null; // last gps accuracy
  statusError: string | null; // error during active tracking
  acquire: { elapsedMs: number; error: string | null; goodFixes: number };
}

const SECONDARY_COUNT = 4;

// gps lock criteria — tracking won't start until the fix is stable
const ACQUIRE_ACCURACY_M = 25;
const ACQUIRE_STABLE_FIXES = 2;

// distance gating against jitter/teleport
const MAX_ACCURACY_M = 50;
const MIN_STEP_M = 0.5;
const MAX_STEP_M = 200;

const log = (...a: unknown[]) => console.log("[tracker]", ...a);

type Fix = { lat: number; lon: number; t: number };

// domain + state machine for the run/ride tracker. dom-free: set an onChange
// callback to re-render, drive with start()/pause()/etc. owns the gps watch.
export class Tracker {
  onChange: (() => void) | null = null;

  private _state: TrackerState = "menu";
  private _mode: Mode = "ride";
  private secondaryIndex = 0;

  private distanceM = 0;
  private maxMs = 0;
  private speedMs = 0;
  private lastFix: Fix | null = null;
  private statusError: string | null = null;

  // clock banked across pauses so paused time isn't counted
  private bankedMs = 0;
  private activeSince = 0;

  // acquiring
  private goodFixes = 0;
  private acquireSince = 0;
  private lastAcc: number | null = null;
  private acqError: string | null = null;

  private readonly kalman = new SpeedKalman();
  private watchId: number | null = null;

  get state(): TrackerState {
    return this._state;
  }
  get mode(): Mode {
    return this._mode;
  }

  private elapsed(): number {
    return this.bankedMs + (this._state === "active" ? Date.now() - this.activeSince : 0);
  }
  private emit(): void {
    this.onChange?.();
  }
  private setState(s: TrackerState): void {
    this._state = s;
    log("state", s);
  }
  private clearWatch(): void {
    if (this.watchId != null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  snapshot(): TrackerSnapshot {
    const elapsedMs = this.elapsed();
    const sec = elapsedMs / 1000;
    return {
      state: this._state,
      mode: this._mode,
      speedMs: this.speedMs,
      distanceM: this.distanceM,
      elapsedMs,
      avgMs: sec > 0 ? this.distanceM / sec : 0,
      maxMs: this.maxMs,
      secondaryIndex: this.secondaryIndex,
      accuracyM: this.lastAcc,
      statusError: this.statusError,
      acquire: {
        elapsedMs: Date.now() - this.acquireSince,
        error: this.acqError,
        goodFixes: this.goodFixes,
      },
    };
  }

  setMode(m: Mode): void {
    this._mode = m;
  }

  // call from a user gesture — starts the gps watch (and its permission prompt)
  start(): void {
    if (!("geolocation" in navigator)) {
      this.setState("acquiring");
      this.acqError = "No geolocation";
      this.emit();
      return;
    }
    this.goodFixes = 0;
    this.lastAcc = null;
    this.acqError = null;
    this.lastFix = null;
    this.acquireSince = Date.now();
    this.setState("acquiring");
    log("watch start", { mode: this._mode });
    this.watchId = navigator.geolocation.watchPosition(
      (p) => this.onPosition(p),
      (e) => this.onError(e),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 },
    );
    this.emit();
  }

  skipAcquire(): void {
    this.enterActive();
  }
  cancel(): void {
    this.clearWatch();
    this.setState("menu");
    this.emit();
  }

  pause(): void {
    this.bankedMs += Date.now() - this.activeSince;
    this.setState("paused");
    this.emit();
  }
  resume(): void {
    this.activeSince = Date.now();
    this.lastFix = null;
    this.kalman.reset();
    this.statusError = null;
    this.setState("active");
    this.emit();
  }
  stop(): void {
    this.clearWatch();
    if (this._state === "active") this.bankedMs += Date.now() - this.activeSince;
    this.setState("summary");
    this.emit();
  }
  toMenu(): void {
    this.setState("menu");
    this.emit();
  }

  cycleSecondary(dir: number): void {
    this.secondaryIndex = (this.secondaryIndex + dir + SECONDARY_COUNT) % SECONDARY_COUNT;
    this.emit();
  }

  // begin tracking — reset accumulators + clock here, never during acquiring
  private enterActive(): void {
    this.distanceM = 0;
    this.maxMs = 0;
    this.speedMs = 0;
    this.lastFix = null;
    this.kalman.reset();
    this.bankedMs = 0;
    this.activeSince = Date.now();
    this.secondaryIndex = 0;
    this.statusError = null;
    log("tracking started", { mode: this._mode });
    this.setState("active");
    this.emit();
  }

  private onPosition(pos: GeolocationPosition): void {
    const { latitude, longitude, speed, accuracy } = pos.coords;
    const t = pos.timestamp;
    this.lastAcc = accuracy == null ? null : Math.round(accuracy);
    this.acqError = null;
    this.statusError = null;
    log("fix", { state: this._state, acc: this.lastAcc, speed });

    if (this._state === "acquiring") {
      if (accuracy != null && accuracy <= ACQUIRE_ACCURACY_M) {
        this.goodFixes++;
        log("good fix", { goodFixes: this.goodFixes, need: ACQUIRE_STABLE_FIXES });
        if (this.goodFixes >= ACQUIRE_STABLE_FIXES) {
          log("gps locked");
          this.enterActive();
          return;
        }
      }
      this.lastFix = { lat: latitude, lon: longitude, t };
      this.emit();
      return;
    }

    if (this._state !== "active") return;

    const prev = this.lastFix;
    let z: number;
    if (speed != null && speed >= 0) {
      z = speed; // doppler speed (best)
    } else if (prev) {
      const d = haversine(prev.lat, prev.lon, latitude, longitude);
      const dt = (t - prev.t) / 1000;
      z = dt > 0 ? d / dt : 0; // fallback: distance/time
    } else {
      z = 0;
    }

    // accumulate distance from position deltas, gated against jitter/teleport
    if (prev) {
      const d = haversine(prev.lat, prev.lon, latitude, longitude);
      const dt = (t - prev.t) / 1000;
      if (
        dt > 0 &&
        (accuracy == null || accuracy < MAX_ACCURACY_M) &&
        d > MIN_STEP_M &&
        d < MAX_STEP_M
      ) {
        this.distanceM += d;
      }
    }

    const dt = prev ? (t - prev.t) / 1000 : 1;
    this.lastFix = { lat: latitude, lon: longitude, t };

    if (z < 0.5) z = 0; // treat sub-walking-pace noise as stationary
    const filtered = this.kalman.update(z, dt, accuracy);
    this.speedMs = filtered < 0.3 ? 0 : filtered;
    if (this.speedMs > this.maxMs) this.maxMs = this.speedMs;

    this.emit();
  }

  private onError(e: GeolocationPositionError): void {
    log("geolocation error", { code: e.code, message: e.message });
    const msg =
      e.code === e.PERMISSION_DENIED
        ? "Location denied"
        : e.code === e.TIMEOUT
          ? "No signal yet…"
          : "Location unavailable";
    if (this._state === "acquiring") this.acqError = msg;
    else this.statusError = msg;
    this.emit();
  }
}
