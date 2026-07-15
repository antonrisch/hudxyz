/**
 * Punchy hue angles — skewed toward pure primaries/secondaries, not muddy midtones.
 *
 * Per-category accents intentionally bypass semantic theme tokens (see AGENTS.md styling
 * exception for dynamic category chips). Chroma stays in-gamut (~0.22) so hues look even.
 */
const CATEGORY_HUES: Record<string, number> = {
  business: 255,
  "developer-tools": 285,
  education: 85,
  entertainment: 15,
  finance: 145,
  "health-fitness": 145,
  lifestyle: 350,
  music: 305,
  navigation: 230,
  news: 40,
  "photo-video": 330,
  productivity: 210,
  reference: 50,
  social: 350,
  sports: 140,
  travel: 220,
  utilities: 200,
  weather: 215,
  action: 25,
  adventure: 160,
  board: 95,
  card: 270,
  casual: 75,
  family: 20,
  puzzle: 295,
  racing: 10,
  "role-playing": 315,
  simulation: 185,
  strategy: 55,
  trivia: 100,
  word: 240,
};

const FALLBACK_HUE = 250;

export type CategoryAccent = {
  /** Saturated accent for the icon. */
  color: string;
  /** Tinted chip fill behind the icon. */
  chip: string;
};

/** Bright accent for a category slug. */
export function getCategoryAccent(slug: string): CategoryAccent {
  const hue = CATEGORY_HUES[slug] ?? FALLBACK_HUE;
  const color = `oklch(0.62 0.22 ${hue})`;
  const chip = `color-mix(in oklch, ${color} 42%, transparent)`;
  return { color, chip };
}
