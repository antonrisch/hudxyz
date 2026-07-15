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

/** Match hudxyz semantic tokens / brand accent (provider-scoped theme). */
const consentTheme = {
  colors: {
    primary: "#0067ff",
    primaryHover: "#0058db",
    surface: "#ffffff",
    surfaceHover: "#f5f5f5",
    border: "#ebebeb",
    text: "#0a0a0a",
    textMuted: "#737373",
    textOnPrimary: "#ffffff",
    overlay: "rgba(0, 0, 0, 0.45)",
  },
  dark: {
    primary: "#3b82ff",
    primaryHover: "#5a96ff",
    surface: "#171717",
    surfaceHover: "#262626",
    border: "#333333",
    text: "#fafafa",
    textMuted: "#a3a3a3",
    textOnPrimary: "#ffffff",
    overlay: "rgba(0, 0, 0, 0.6)",
  },
  radius: {
    sm: "0.375rem",
    md: "0.5rem",
    lg: "0.75rem",
  },
  consentActions: {
    accept: { variant: "primary" as const, mode: "filled" as const },
    reject: { variant: "neutral" as const, mode: "stroke" as const },
    customize: { variant: "neutral" as const, mode: "ghost" as const },
  },
  slots: {
    consentBannerCard: "max-w-[min(28rem,calc(100vw-2rem))]",
    consentBannerFooter: "gap-2",
  },
};

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
    colorScheme: "system" as const,
    theme: consentTheme,
  };

  return (
    <ConsentManagerProvider options={options}>
      <SettledConsentAnalytics />
      <ConsentBanner layout={["customize", ["reject", "accept"]]} primaryButton="accept" />
      <ConsentDialog />
      {children}
    </ConsentManagerProvider>
  );
}
