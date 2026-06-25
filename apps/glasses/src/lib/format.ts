// display formatting for the tracker: raw units (m/s, meters, ms) → glanceable strings

// ms → "h:mm:ss" or "m:ss"
export function fmtTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

// meters → "N m" under 1 km, else "N.NN km"
export function fmtDist(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(2)} km`;
}

// m/s → "m:ss" per km; "--:--" when too slow to be meaningful
export function fmtPace(ms: number): string {
  if (ms < 0.3) return "--:--";
  const sec = 1000 / ms;
  let mm = Math.floor(sec / 60),
    ss = Math.round(sec % 60);
  if (ss === 60) {
    mm += 1;
    ss = 0;
  }
  return `${mm}:${String(ss).padStart(2, "0")}`;
}

// m/s → whole km/h string
export const kmh = (ms: number): string => String(Math.round(ms * 3.6));
