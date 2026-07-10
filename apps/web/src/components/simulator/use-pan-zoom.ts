"use client";

import {
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  useCallback,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import {
  DEFAULT_DEVICE_SCALE,
  desktopDeviceScale,
  mobileGlassesDeviceScale,
} from "@/lib/simulator/config";
import type { View } from "@/lib/simulator/store";
import { useMobileLayout } from "@/lib/use-mobile-layout";
import { useMountEffect } from "@/lib/use-mount-effect";

const SCALE_MIN = 0.3;
const SCALE_MAX = 10;
const ZOOM_STEP = 0.1; // absolute percentage points (+/− 10% per click or keyboard shortcut)

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

const isTypingTarget = (el: EventTarget | null) => {
  const node = el as HTMLElement | null;
  if (!node) return false;
  const tag = node.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || node.isContentEditable;
};

function pointerDistance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

// cmd/ctrl +/-/0 → canvas zoom; returns true when handled (caller should not fall through).
export function applyPanZoomShortcut(
  e: KeyboardEvent,
  pan: Pick<PanZoom, "zoomIn" | "zoomOut" | "reset">,
): boolean {
  if (!e.metaKey && !e.ctrlKey) return false;
  if (isTypingTarget(e.target)) return false;

  if (e.key === "0") {
    e.preventDefault();
    pan.reset();
    return true;
  }

  const zoomIn = e.key === "+" || e.key === "=";
  const zoomOut = e.key === "-" || e.key === "_";
  if (!zoomIn && !zoomOut) return false;

  e.preventDefault();
  if (zoomIn) pan.zoomIn();
  else pan.zoomOut();
  return true;
}

interface Transform {
  scale: number;
  x: number;
  y: number;
}

/** Pointer handlers for the stage capture overlay (Pointer Events + touch-action: none). */
export type PanZoomBind = {
  onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove: (e: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp: (e: ReactPointerEvent<HTMLElement>) => void;
  onPointerCancel: (e: ReactPointerEvent<HTMLElement>) => void;
};

export interface PanZoom {
  viewportRef: RefObject<HTMLDivElement | null>;
  contentRef: RefObject<HTMLDivElement | null>;
  /** Current 600×600 magnification (read anytime; does not subscribe). */
  getScale: () => number;
  /** Subscribe to scale commits (ZoomControls). Returns unsubscribe. */
  subscribeScale: (onStoreChange: () => void) => () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomTo: (scale: number) => void;
  reset: (view?: View) => void; // pass the target view to recenter after a switch
  bind: () => PanZoomBind;
}

/** React subscription for the zoom % label — does not re-render Simulator. */
export function usePanZoomScale(panZoom: PanZoom): number {
  return useSyncExternalStore(panZoom.subscribeScale, panZoom.getScale, panZoom.getScale);
}

type SetTransformOptions = {
  /** Skip rAF coalescing — use for view reset / layout so the first paint is correct. */
  immediate?: boolean;
};

// canvas pan/zoom over the device plane. Gestures write CSS transform on #hud-device
// imperatively (no React re-render per frame). Zoom UI subscribes via usePanZoomScale.
export function usePanZoom(view: View, onTransformCommit?: () => void): PanZoom {
  const mobile = useMobileLayout();
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef(mobile);
  mobileRef.current = mobile;
  const onTransformCommitRef = useRef(onTransformCommit);
  onTransformCommitRef.current = onTransformCommit;

  const tRef = useRef<Transform>({ scale: 1, x: 0, y: 0 });
  const pendingRef = useRef<Transform | null>(null);
  const rafRef = useRef<number | null>(null);
  const scaleListenersRef = useRef(new Set<() => void>());

  const setContentRevealed = useCallback((visible: boolean) => {
    const el = contentRef.current;
    if (el) el.style.opacity = visible ? "1" : "0";
  }, []);

  // Active pointers for pan (1) / pinch (2). Keyed by pointerId.
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchStartRef = useRef<{ distance: number; scale: number } | null>(null);

  const resolveDeviceScale = useCallback(
    (v: View = view) => {
      if (!mobileRef.current) return desktopDeviceScale(v);
      if (v === "glasses") return mobileGlassesDeviceScale();
      const vp = viewportRef.current;
      const c = contentRef.current;
      if (!vp || !c?.offsetWidth) return DEFAULT_DEVICE_SCALE.pixel;
      return vp.clientWidth / c.offsetWidth;
    },
    [view],
  );

  const paintTransform = useCallback((next: Transform) => {
    tRef.current = next;
    const el = contentRef.current;
    if (el) {
      el.style.transform = `translate(${next.x}px, ${next.y}px) scale(${next.scale})`;
      el.style.transformOrigin = "0 0";
    }
    for (const cb of scaleListenersRef.current) cb();
    onTransformCommitRef.current?.();
  }, []);

  const flushPending = useCallback(() => {
    rafRef.current = null;
    const next = pendingRef.current;
    if (!next) return;
    pendingRef.current = null;
    paintTransform(next);
  }, [paintTransform]);

  // One DOM write per animation frame during gestures (not per pointer/wheel event).
  const setTransform = useCallback(
    (updater: Transform | ((cur: Transform) => Transform), options?: SetTransformOptions) => {
      const cur = pendingRef.current ?? tRef.current;
      const next = typeof updater === "function" ? updater(cur) : updater;
      pendingRef.current = next;

      if (options?.immediate) {
        if (rafRef.current != null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        pendingRef.current = null;
        paintTransform(next);
        return;
      }

      if (rafRef.current == null) {
        rafRef.current = requestAnimationFrame(flushPending);
      }
    },
    [flushPending, paintTransform],
  );

  useMountEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  });

  // default framing at a given 600×600 magnification: center the display in the viewport.
  const computeDefault = useCallback((ds: number): Transform => {
    const vp = viewportRef.current;
    const c = contentRef.current;
    if (!vp || !c) return { scale: 1, x: 0, y: 0 };
    const vw = vp.clientWidth;
    const vh = vp.clientHeight;
    const cw = c.offsetWidth;
    const ch = c.offsetHeight;
    if (!cw || !ch) return { scale: 1, x: 0, y: 0 };
    return { scale: ds, x: (vw - cw * ds) / 2, y: (vh - ch * ds) / 2 };
  }, []);

  const reset = useCallback(
    (v: View = view) => {
      setTransform(computeDefault(resolveDeviceScale(v)), { immediate: true });
    },
    [computeDefault, resolveDeviceScale, setTransform, view],
  );

  // apply per-view default zoom + framing before paint (view toggle always lands here).
  useLayoutEffect(() => {
    const c = contentRef.current;
    if (!c) return;

    setContentRevealed(false);
    let frame = 0;

    const apply = () => {
      setTransform(computeDefault(resolveDeviceScale(view)), { immediate: true });
      frame = requestAnimationFrame(() => setContentRevealed(true));
    };

    if (c.offsetWidth && c.offsetHeight) {
      apply();
      return () => cancelAnimationFrame(frame);
    }

    const ro = new ResizeObserver(() => {
      if (!c.offsetWidth || !c.offsetHeight) return;
      apply();
      ro.disconnect();
    });
    ro.observe(c);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, [computeDefault, mobile, resolveDeviceScale, setContentRevealed, setTransform, view]);

  // zoom about a viewport point, keeping the content point under it fixed
  const setDeviceScaleAt = useCallback(
    (clientX: number, clientY: number, nextDevice: number) => {
      const vp = viewportRef.current;
      if (!vp) return;
      const r = vp.getBoundingClientRect();
      const px = clientX - r.left;
      const py = clientY - r.top;
      setTransform((cur) => {
        const scale = clamp(nextDevice, SCALE_MIN, SCALE_MAX);
        const k = scale / cur.scale;
        return { scale, x: px - (px - cur.x) * k, y: py - (py - cur.y) * k };
      });
    },
    [setTransform],
  );

  const zoomAt = useCallback(
    (clientX: number, clientY: number, factor: number) => {
      const vp = viewportRef.current;
      if (!vp) return;
      const r = vp.getBoundingClientRect();
      const px = clientX - r.left;
      const py = clientY - r.top;
      setTransform((cur) => {
        const scale = clamp(cur.scale * factor, SCALE_MIN, SCALE_MAX);
        const k = scale / cur.scale;
        return { scale, x: px - (px - cur.x) * k, y: py - (py - cur.y) * k };
      });
    },
    [setTransform],
  );

  const zoomAtRef = useRef(zoomAt);
  zoomAtRef.current = zoomAt;

  const zoomTo = useCallback(
    (nextDeviceScale: number) => {
      const vp = viewportRef.current;
      if (!vp) return;
      const r = vp.getBoundingClientRect();
      setDeviceScaleAt(r.left + r.width / 2, r.top + r.height / 2, nextDeviceScale);
    },
    [setDeviceScaleAt],
  );

  const stepZoom = useCallback(
    (delta: number) => {
      zoomTo(clamp(tRef.current.scale + delta, SCALE_MIN, SCALE_MAX));
    },
    [zoomTo],
  );

  const resetRef = useRef(reset);
  resetRef.current = reset;
  const setDeviceScaleAtRef = useRef(setDeviceScaleAt);
  setDeviceScaleAtRef.current = setDeviceScaleAt;
  const stepZoomRef = useRef(stepZoom);
  stepZoomRef.current = stepZoom;
  const zoomToRef = useRef(zoomTo);
  zoomToRef.current = zoomTo;

  const panShortcutRef = useRef({
    zoomIn: () => stepZoomRef.current(ZOOM_STEP),
    zoomOut: () => stepZoomRef.current(-ZOOM_STEP),
    reset: () => resetRef.current(),
  });

  // cmd/ctrl +/-/0 on the host page (blocks browser page zoom).
  useMountEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => applyPanZoomShortcut(e, panShortcutRef.current);
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const setTransformRef = useRef(setTransform);
  setTransformRef.current = setTransform;

  // Trackpad pinch arrives as wheel+ctrlKey; cmd/ctrl-scroll zooms; plain wheel pans.
  // Native non-passive listener — React's onWheel is passive and can't preventDefault.
  useMountEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        zoomAtRef.current(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.01));
      } else {
        setTransformRef.current((cur) => ({ ...cur, x: cur.x - e.deltaX, y: cur.y - e.deltaY }));
      }
    };
    vp.addEventListener("wheel", onWheel, { passive: false });
    return () => vp.removeEventListener("wheel", onWheel);
  });

  // keep the viewport center anchored on resize (don't left-align): shift the pan by half
  // the size delta so the world point under the center stays put, preserving the pan/zoom.
  useMountEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    let prev = { w: vp.clientWidth, h: vp.clientHeight };
    const ro = new ResizeObserver(() => {
      const w = vp.clientWidth;
      const h = vp.clientHeight;
      const dw = w - prev.w;
      const dh = h - prev.h;
      prev = { w, h };
      if (dw === 0 && dh === 0) return;

      setTransformRef.current((cur) => ({ ...cur, x: cur.x + dw / 2, y: cur.y + dh / 2 }));
    });
    ro.observe(vp);
    return () => ro.disconnect();
  });

  const endPointer = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    const pointers = pointersRef.current;
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Already released.
    }
    if (pointers.size < 2) pinchStartRef.current = null;
  }, []);

  // Stable API object — must not change identity or SimulatorContext re-renders the tree.
  const apiRef = useRef<PanZoom | null>(null);
  if (!apiRef.current) {
    apiRef.current = {
      viewportRef,
      contentRef,
      getScale: () => tRef.current.scale,
      subscribeScale: (onStoreChange) => {
        scaleListenersRef.current.add(onStoreChange);
        return () => {
          scaleListenersRef.current.delete(onStoreChange);
        };
      },
      zoomIn: () => stepZoomRef.current(ZOOM_STEP),
      zoomOut: () => stepZoomRef.current(-ZOOM_STEP),
      zoomTo: (scale) => zoomToRef.current(scale),
      reset: (v) => resetRef.current(v),
      bind: () => ({
        onPointerDown: (e) => {
          if (e.pointerType === "mouse" && e.button !== 0) return;

          const pointers = pointersRef.current;
          pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
          e.currentTarget.setPointerCapture(e.pointerId);

          if (pointers.size === 2) {
            const [a, b] = [...pointers.values()];
            const distance = pointerDistance(a, b);
            if (distance > 0) {
              pinchStartRef.current = { distance, scale: tRef.current.scale };
            }
          }
        },

        onPointerMove: (e) => {
          const pointers = pointersRef.current;
          if (!pointers.has(e.pointerId)) return;

          const prev = pointers.get(e.pointerId)!;
          pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

          if (pointers.size >= 2) {
            const [a, b] = [...pointers.values()];
            const distance = pointerDistance(a, b);
            const pinch = pinchStartRef.current;
            if (!pinch || distance <= 0) return;

            const originX = (a.x + b.x) / 2;
            const originY = (a.y + b.y) / 2;
            setDeviceScaleAtRef.current(
              originX,
              originY,
              pinch.scale * (distance / pinch.distance),
            );
            return;
          }

          const dx = e.clientX - prev.x;
          const dy = e.clientY - prev.y;
          if (dx === 0 && dy === 0) return;
          setTransformRef.current((cur) => ({ ...cur, x: cur.x + dx, y: cur.y + dy }));
        },

        onPointerUp: endPointer,
        onPointerCancel: endPointer,
      }),
    };
  }

  return apiRef.current;
}
