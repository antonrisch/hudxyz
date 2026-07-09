"use client";

import { useEffect, type RefObject } from "react";
import { useReducedMotion } from "@/lib/use-reduced-motion";

/**
 * Owns play/pause for the single HW-decoded backdrop <video>.
 * keepPlaying: do not pause on document.hidden (share-tab picker / recording).
 */
export function useBackdropVideoLeader(
  ref: RefObject<HTMLVideoElement | null>,
  active: boolean,
  keepPlaying = false,
) {
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || !active) return;

    const play = () => {
      if (reducedMotion) return;
      void el.play().catch(() => {});
    };

    play();

    const onVisibility = () => {
      if (document.hidden && !keepPlaying) el.pause();
      else play();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      el.pause();
    };
  }, [active, keepPlaying, reducedMotion, ref]);
}
