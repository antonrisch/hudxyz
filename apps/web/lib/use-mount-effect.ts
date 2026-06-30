import { useEffect } from "react";

// one-time external sync on mount (keydown listeners, store subscriptions, DOM observers).
export function useMountEffect(effect: () => void | (() => void)) {
  /* eslint-disable no-restricted-syntax */
  useEffect(effect, []);
}
