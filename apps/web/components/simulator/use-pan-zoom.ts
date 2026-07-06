"use client";

import {
  type CSSProperties,
  type RefObject,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useGesture } from "@use-gesture/react";
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

// cmd/ctrl +/-/0 → canvas zoom; returns true when handled (caller should not fall through).
export function applyPanZoomShortcut(
  e: KeyboardEvent,
  pan: Pick<PanZoom, "zoomIn" | "zoomOut" | "reset" | "interactive">,
): boolean {
  if (!pan.interactive) return false;
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

export interface PanZoom {
  viewportRef: RefObject<HTMLDivElement | null>;
  contentRef: RefObject<HTMLDivElement | null>;
  style: CSSProperties; // transform for the content; origin top-left
  revealed: boolean; // false while layout is applied; fades in on the next frame
  scale: number; // 600×600 magnification; 1 = true device pixels on screen
  interactive: boolean; // false on mobile: zoom/pan locked to per-view defaults
  zoomIn: () => void;
  zoomOut: () => void;
  zoomTo: (scale: number) => void;
  reset: (view?: View) => void; // pass the target view to recenter after a switch
  bind: ReturnType<typeof useGesture>;
}

// canvas pan/zoom over the device plane. the content plane is always the 600×600 display
// (glasses chrome hangs off it decoratively), so zoom is the plain deviceScale in every
// view (1 = true pixels). drag pans; pinch / cmd-scroll zooms to the cursor; the buttons
// zoom about the viewport center.
export function usePanZoom(view: View): PanZoom {
  const mobile = useMobileLayout();
  const interactive = !mobile;
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef(mobile);
  mobileRef.current = mobile;
  const viewRef = useRef(view);
  viewRef.current = view;

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

  const deviceScaleRef = useRef<number>(DEFAULT_DEVICE_SCALE.pixel);
  const [deviceScale, setDeviceScale] = useState<number>(DEFAULT_DEVICE_SCALE.pixel);
  const [t, setT] = useState<Transform>({ scale: 1, x: 0, y: 0 });
  const [revealed, setRevealed] = useState(false);
  const pinchStartScale = useRef(deviceScaleRef.current);

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
      const ds = resolveDeviceScale(v);
      deviceScaleRef.current = ds;
      setDeviceScale(ds);
      setT(computeDefault(ds));
    },
    [computeDefault, resolveDeviceScale, view],
  );

  // apply per-view default zoom + framing before paint (view toggle always lands here).
  useLayoutEffect(() => {
    const c = contentRef.current;
    if (!c) return;

    setRevealed(false);
    let frame = 0;

    const apply = () => {
      const ds = resolveDeviceScale(view);
      deviceScaleRef.current = ds;
      setDeviceScale(ds);
      setT(computeDefault(ds));
      frame = requestAnimationFrame(() => setRevealed(true));
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
  }, [computeDefault, mobile, resolveDeviceScale, view]);

  // zoom about a viewport point, keeping the content point under it fixed
  const setDeviceScaleAt = useCallback((clientX: number, clientY: number, nextDevice: number) => {
    if (mobileRef.current) return;
    const vp = viewportRef.current;
    if (!vp) return;
    const r = vp.getBoundingClientRect();
    const px = clientX - r.left;
    const py = clientY - r.top;
    setT((cur) => {
      const scale = clamp(nextDevice, SCALE_MIN, SCALE_MAX);
      deviceScaleRef.current = scale;
      setDeviceScale(scale);
      const k = scale / cur.scale;
      return { scale, x: px - (px - cur.x) * k, y: py - (py - cur.y) * k };
    });
  }, []);

  const zoomAt = useCallback((clientX: number, clientY: number, factor: number) => {
    if (mobileRef.current) return;
    const vp = viewportRef.current;
    if (!vp) return;
    const r = vp.getBoundingClientRect();
    const px = clientX - r.left;
    const py = clientY - r.top;
    setT((cur) => {
      const scale = clamp(cur.scale * factor, SCALE_MIN, SCALE_MAX);
      deviceScaleRef.current = scale;
      setDeviceScale(scale);
      const k = scale / cur.scale;
      return { scale, x: px - (px - cur.x) * k, y: py - (py - cur.y) * k };
    });
  }, []);

  const zoomAtRef = useRef(zoomAt);
  zoomAtRef.current = zoomAt;

  const zoomCenter = useCallback(
    (factor: number) => {
      const vp = viewportRef.current;
      if (!vp) return;
      const r = vp.getBoundingClientRect();
      zoomAt(r.left + r.width / 2, r.top + r.height / 2, factor);
    },
    [zoomAt],
  );

  const zoomTo = useCallback(
    (nextDeviceScale: number) => {
      if (mobileRef.current) return;
      const vp = viewportRef.current;
      if (!vp) return;
      const r = vp.getBoundingClientRect();
      setDeviceScaleAt(r.left + r.width / 2, r.top + r.height / 2, nextDeviceScale);
    },
    [setDeviceScaleAt],
  );

  const stepZoom = useCallback(
    (delta: number) => {
      zoomTo(clamp(deviceScaleRef.current + delta, SCALE_MIN, SCALE_MAX));
    },
    [zoomTo],
  );

  const zoomCenterRef = useRef(zoomCenter);
  zoomCenterRef.current = zoomCenter;
  const resetRef = useRef(reset);
  resetRef.current = reset;
  const setDeviceScaleAtRef = useRef(setDeviceScaleAt);
  setDeviceScaleAtRef.current = setDeviceScaleAt;
  const stepZoomRef = useRef(stepZoom);
  stepZoomRef.current = stepZoom;

  const panShortcutRef = useRef({
    interactive,
    zoomIn: () => stepZoomRef.current(ZOOM_STEP),
    zoomOut: () => stepZoomRef.current(-ZOOM_STEP),
    reset: () => resetRef.current(),
  });
  panShortcutRef.current.interactive = interactive;

  // cmd/ctrl +/-/0 on the host page (blocks browser page zoom).
  useMountEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => applyPanZoomShortcut(e, panShortcutRef.current);
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  // pinch (ctrlKey) / cmd-scroll = zoom to cursor; plain wheel = pan. native non-passive
  // listener so preventDefault works (react's onWheel is passive).
  useMountEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onWheel = (e: WheelEvent) => {
      if (mobileRef.current) return;
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        zoomAtRef.current(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.01));
      } else {
        setT((cur) => ({ ...cur, x: cur.x - e.deltaX, y: cur.y - e.deltaY }));
      }
    };
    vp.addEventListener("wheel", onWheel, { passive: false });
    return () => vp.removeEventListener("wheel", onWheel);
  });

  const computeDefaultRef = useRef(computeDefault);
  computeDefaultRef.current = computeDefault;
  const resolveDeviceScaleRef = useRef(resolveDeviceScale);
  resolveDeviceScaleRef.current = resolveDeviceScale;

  // desktop: keep the viewport center anchored on resize. mobile: refit the locked scale.
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

      if (mobileRef.current) {
        const ds = resolveDeviceScaleRef.current(viewRef.current);
        deviceScaleRef.current = ds;
        setDeviceScale(ds);
        setT(computeDefaultRef.current(ds));
        return;
      }

      setT((cur) => ({ ...cur, x: cur.x + dw / 2, y: cur.y + dh / 2 }));
    });
    ro.observe(vp);
    return () => ro.disconnect();
  });

  const bind = useGesture(
    {
      onDrag: ({ delta: [dx, dy] }) => {
        if (mobileRef.current) return;
        setT((cur) => ({ ...cur, x: cur.x + dx, y: cur.y + dy }));
      },
      onPinch: ({ first, movement: [scale], origin: [x, y] }) => {
        if (mobileRef.current) return;
        if (first) pinchStartScale.current = deviceScaleRef.current;
        setDeviceScaleAtRef.current(x, y, pinchStartScale.current * scale);
      },
    },
    {
      drag: { preventDefault: true, enabled: interactive },
      eventOptions: { passive: false },
      pinch: {
        preventDefault: true,
        enabled: interactive,
        scaleBounds: { min: SCALE_MIN, max: SCALE_MAX },
      },
    },
  );

  return {
    viewportRef,
    contentRef,
    revealed,
    interactive,
    style: {
      transform: `translate(${t.x}px, ${t.y}px) scale(${t.scale})`,
      transformOrigin: "0 0",
    },
    scale: deviceScale,
    zoomIn: () => stepZoom(ZOOM_STEP),
    zoomOut: () => stepZoom(-ZOOM_STEP),
    zoomTo,
    reset,
    bind,
  };
}
