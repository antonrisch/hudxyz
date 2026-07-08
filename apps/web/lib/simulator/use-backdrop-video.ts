"use client";

import { useEffect, useState, type RefObject } from "react";
import { useBackdropVideoLeaderContext } from "@/lib/simulator/backdrop-video-context";
import { useReducedMotion } from "@/lib/use-reduced-motion";

export function useBackdropVideoLeader(
  ref: RefObject<HTMLVideoElement | null>,
  active: boolean,
) {
  const ctx = useBackdropVideoLeaderContext();
  const reducedMotion = useReducedMotion();

  // Register / unregister the leader element.
  // ctx is stable (never changes identity), so this only re-runs when active changes.
  useEffect(() => {
    if (!ctx) return;
    const el = ref.current;
    if (!active || !el) {
      ctx.setLeader(null);
      return;
    }
    ctx.setLeader(el);
    return () => ctx.setLeader(null);
  }, [active, ctx, ref]);

  // Play / pause lifecycle.
  useEffect(() => {
    const el = ref.current;
    if (!el || !active) return;

    const play = () => {
      if (reducedMotion) return;
      void el.play().catch(() => {});
    };

    play();

    const onVisibility = () => {
      if (document.hidden) el.pause();
      else play();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      el.pause();
    };
  }, [active, reducedMotion, ref]);
}

/**
 * Mirrors the leader video's frames onto a canvas via requestVideoFrameCallback.
 * Single decoder, zero drift — the canvas always shows the exact frame the leader shows.
 */
export function useBackdropVideoMirror(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  active: boolean,
) {
  const ctx = useBackdropVideoLeaderContext();

  // Re-run the mirror effect when the leader element swaps.
  const [leaderVersion, setLeaderVersion] = useState(0);
  useEffect(() => {
    if (!ctx) return;
    return ctx.subscribe(() => setLeaderVersion((v) => v + 1));
  }, [ctx]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!active || !canvas || !ctx) return;

    const leader = ctx.getLeader();
    if (!leader) return;

    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;

    const draw = () => {
      const vw = leader.videoWidth;
      const vh = leader.videoHeight;
      if (!vw || !vh) return;
      if (canvas.width !== vw || canvas.height !== vh) {
        canvas.width = vw;
        canvas.height = vh;
      }
      ctx2d.drawImage(leader, 0, 0, vw, vh);
    };

    // Paint immediately if the leader already has a decoded frame.
    draw();

    // requestVideoFrameCallback fires once per decoded video frame — no wasted draws.
    if ("requestVideoFrameCallback" in leader) {
      let handle: number;
      const loop = () => {
        draw();
        handle = leader.requestVideoFrameCallback(loop);
      };
      handle = leader.requestVideoFrameCallback(loop);
      return () => leader.cancelVideoFrameCallback(handle);
    }

    // Fallback: RAF loop (fires every display frame; some draws may be redundant).
    let rafId: number;
    const loop = () => {
      draw();
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [active, canvasRef, ctx, leaderVersion]);
}
