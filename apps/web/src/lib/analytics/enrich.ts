import { getAnalyticsIdentityMode } from "./identity";
import { sanitizeAnalyticsProperties } from "./sanitize";

/** Sanitize URL props and attach the current identity mode centrally. */
export function enrichAnalyticsProperties(
  properties: Record<string, unknown> | undefined,
): Record<string, unknown> {
  return {
    ...sanitizeAnalyticsProperties(properties),
    analytics_identity_mode: getAnalyticsIdentityMode(),
  };
}
