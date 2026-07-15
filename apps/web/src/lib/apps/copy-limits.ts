/**
 * Detail-page description. Apple/Google allow 4,000, but MRBD listings are short;
 * 500 fits a lead paragraph plus features/controls without essay-length copy.
 */
export const DESCRIPTION_MAX_LENGTH = 500;

export function truncateToMaxLength(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd();
}

export function isWithinMaxLength(text: string, max: number): boolean {
  return text.length <= max;
}
