"use client";

import { useEffect, useState, type RefCallback } from "react";
import { useReducedMotion } from "@/lib/use-reduced-motion";

/**
 * Owns play/pause for the single HW-decoded backdrop <video>.
 * Returns a callback ref so play re-binds when the element remounts (src switch).
 * keepPlaying: do not pause on document.hidden (share-tab picker / recording).
 */
export function useBackdropVideoPlayback(
  active: boolean,
  keepPlaying = false,
): RefCallback<HTMLVideoElement> {
  const reducedMotion = useReducedMotion();
  const [el, setEl] = useState<HTMLVideoElement | null>(null);

  useEffect(() => {
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
  }, [active, el, keepPlaying, reducedMotion]);

  return setEl;
}
