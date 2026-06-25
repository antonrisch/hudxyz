// 1-D Kalman filter for GPS speed (m/s). models speed as a random walk: each
// step the true speed may drift (process noise q), each measurement is noisy
// (measurement noise r, scaled up when the gps fix is less accurate). removes
// spikes without the lag of a long moving average, and auto-weights by accuracy.

export interface SpeedKalmanOptions {
  q?: number; // process noise — how fast speed can truly change. higher = more responsive
  r?: number; // base measurement noise. higher = more smoothing
}

export class SpeedKalman {
  private x = 0; // estimated speed, m/s
  private p = 1; // estimate variance
  private readonly q: number;
  private readonly r: number;
  private initialized = false;

  constructor(opts: SpeedKalmanOptions = {}) {
    this.q = opts.q ?? 0.6;
    this.r = opts.r ?? 4;
  }

  reset(): void {
    this.x = 0;
    this.p = 1;
    this.initialized = false;
  }

  get value(): number {
    return this.x;
  }

  // fold in one measurement. z = measured speed (m/s), dtSec since last update,
  // accuracyM = gps horizontal accuracy in m (worse → trust the measurement less).
  update(z: number, dtSec: number, accuracyM?: number | null): number {
    if (!this.initialized) {
      this.x = z;
      this.p = this.r;
      this.initialized = true;
      return this.x;
    }
    // predict: estimate variance grows with elapsed time
    this.p += this.q * Math.max(dtSec, 0.001);
    // measurement noise scales with fix accuracy (±10 m ≈ baseline trust)
    const r = accuracyM != null ? this.r * Math.max(1, accuracyM / 10) : this.r;
    // update: blend prediction with measurement by kalman gain
    const k = this.p / (this.p + r);
    this.x += k * (z - this.x);
    this.p = (1 - k) * this.p;
    return this.x;
  }
}
