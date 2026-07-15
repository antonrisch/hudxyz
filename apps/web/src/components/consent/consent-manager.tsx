"use client";

import {
  ConsentBanner,
  ConsentDialog,
  ConsentManagerProvider,
  useConsentManager,
} from "@c15t/nextjs";
import type { ReactNode } from "react";

import { syncPostHogMeasurementConsent } from "@/lib/analytics/client";
import { c15tBackendUrl, settledMeasurementConsent } from "@/lib/consent/config";
import { useMountEffect } from "@/lib/use-mount-effect";

const consentCategories = ["necessary", "measurement"] as const;

type SubscribeToConsentChanges = ReturnType<typeof useConsentManager>["subscribeToConsentChanges"];

function ConsentAnalyticsSync({
  initialMeasurement,
  subscribeToConsentChanges,
}: {
  initialMeasurement: boolean;
  subscribeToConsentChanges: SubscribeToConsentChanges;
}) {
  useMountEffect(() => {
    syncPostHogMeasurementConsent(initialMeasurement);
    return subscribeToConsentChanges(({ preferences }) => {
      syncPostHogMeasurementConsent(Boolean(preferences.measurement));
    });
  });

  return null;
}

function SettledConsentAnalytics() {
  const { consents, hasFetchedBanner, subscribeToConsentChanges } = useConsentManager();
  const initialMeasurement = settledMeasurementConsent(
    hasFetchedBanner,
    Boolean(consents.measurement),
  );

  if (initialMeasurement === undefined) return null;

  return (
    <ConsentAnalyticsSync
      initialMeasurement={initialMeasurement}
      subscribeToConsentChanges={subscribeToConsentChanges}
    />
  );
}

/** Root consent UI + PostHog measurement sync. */
export function ConsentManager({ children }: { children: ReactNode }) {
  const backendURL = c15tBackendUrl();
  const modeOptions = backendURL
    ? { mode: "hosted" as const, backendURL }
    : { mode: "offline" as const };
  const options = {
    ...modeOptions,
    consentCategories: [...consentCategories],
    reloadOnConsentRevoked: true,
  };

  return (
    <ConsentManagerProvider options={options}>
      <SettledConsentAnalytics />
      <ConsentBanner />
      <ConsentDialog />
      {children}
    </ConsentManagerProvider>
  );
}
