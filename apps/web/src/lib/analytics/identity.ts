export type AnalyticsIdentityMode = "persistent" | "cookieless";

let identityMode: AnalyticsIdentityMode = "cookieless";
let consentResolved = false;

/** True once c15t has resolved measurement consent for this page load. */
export function isAnalyticsConsentResolved(): boolean {
  return consentResolved;
}

export function getAnalyticsIdentityMode(): AnalyticsIdentityMode {
  return identityMode;
}

/** Update the identity mode after c15t settles or changes measurement consent. */
export function setAnalyticsIdentityMode(mode: AnalyticsIdentityMode): void {
  identityMode = mode;
  consentResolved = true;
}

/** Map c15t measurement consent to PostHog identity mode. */
export function identityModeFromMeasurementConsent(
  hasMeasurementConsent: boolean,
): AnalyticsIdentityMode {
  return hasMeasurementConsent ? "persistent" : "cookieless";
}

/** Test-only: restore unresolved cookieless defaults between cases. */
export function resetAnalyticsIdentityForTests(): void {
  identityMode = "cookieless";
  consentResolved = false;
}
