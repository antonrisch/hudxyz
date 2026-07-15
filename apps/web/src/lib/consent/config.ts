/** Hosted c15t backend URL (e.g. https://your-instance.c15t.dev). */
export function c15tBackendUrl(): string | undefined {
  const url = process.env.NEXT_PUBLIC_C15T_BACKEND_URL?.trim();
  return url || undefined;
}

/** Ignore c15t's placeholder store state until jurisdiction and policy resolve. */
export function settledMeasurementConsent(
  hasFetchedBanner: boolean,
  measurement: boolean,
): boolean | undefined {
  return hasFetchedBanner ? measurement : undefined;
}
