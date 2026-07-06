import { useSyncExternalStore } from "react";

// tailwind sm breakpoint — keep in sync with layout below 640px.
export const MOBILE_MQ = "(max-width: 639px)";

function subscribe(onStoreChange: () => void) {
  const mq = window.matchMedia(MOBILE_MQ);
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getSnapshot() {
  return window.matchMedia(MOBILE_MQ).matches;
}

export function useMobileLayout() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
