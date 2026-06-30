"use client";

import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { DEFAULT_DEVICE_SCALE, LENS_CENTER, RIGHT_LENS, VIEWPORT } from "@/lib/emulator/config";
import type { View } from "@/lib/emulator/store";
import { useMountEffect } from "@/lib/use-mount-effect";

const SCALE_MIN = 0.2;
const SCALE_MAX = 10;
const BUTTON_STEP = 1.25;

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

// glasses fit the 600×600 display into the lens slot; 1:1 pans the surface directly.
const innerScale = (cw: number) => ((RIGHT_LENS.size / 100) * cw) / VIEWPORT;

const panScaleFromDevice = (deviceScale: number, v: View, cw: number) =>
  v === "glasses" ? deviceScale / innerScale(cw) : deviceScale;

const deviceScaleFromPan = (panScale: number, v: View, cw: number) =>
  v === "glasses" ? panScale * innerScale(cw) : panScale;

const defaultDeviceScale = (v: View) => DEFAULT_DEVICE_SCALE[v];

const isTypingTarget = (el: EventTarget | null) => {
  const node = el as HTMLElement | null;
  if (!node) return false;
  const tag = node.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || node.isContentEditable;
};

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

export interface PanZoom {
  viewportRef: RefObject<HTMLDivElement | null>;
  contentRef: RefObject<HTMLDivElement | null>;
  style: CSSProperties; // transform for the content; origin top-left
  revealed: boolean; // false while layout is applied; fades in on the next frame
  scale: number; // 600×600 magnification; 1 = true device pixels on screen
  zoomIn: () => void;
  zoomOut: () => void;
  reset: (view?: View) => void; // pass the target view to recenter after a switch
  bind: {
    onPointerDown: (e: ReactPointerEvent) => void;
    onPointerMove: (e: ReactPointerEvent) => void;
    onPointerUp: (e: ReactPointerEvent) => void;
  };
}

// canvas pan/zoom over the device plane. zoom is expressed as 600×600 deviceScale (1 = true
// pixels); glasses maps that through the lens-slot fit. drag pans; pinch / cmd-scroll zooms
// to the cursor; the buttons zoom about the viewport center.
export function usePanZoom(view: View): PanZoom {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef(view);
  viewRef.current = view;
  const deviceScaleRef = useRef<number>(defaultDeviceScale(view));
  const [deviceScale, setDeviceScale] = useState<number>(() => defaultDeviceScale(view));
  const [t, setT] = useState<Transform>({ scale: 1, x: 0, y: 0 });
  const [revealed, setRevealed] = useState(false);
  const drag = useRef<{ x: number; y: number } | null>(null);

  // per-view framing at a given 600×600 magnification; glasses centers the lens midpoint.
  const computeDefault = useCallback((v: View, ds: number): Transform => {
    const vp = viewportRef.current;
    const c = contentRef.current;
    if (!vp || !c) return { scale: 1, x: 0, y: 0 };
    const vw = vp.clientWidth;
    const vh = vp.clientHeight;
    const cw = c.offsetWidth;
    const ch = c.offsetHeight;
    if (!cw || !ch) return { scale: 1, x: 0, y: 0 };
    const scale = panScaleFromDevice(ds, v, cw);
    if (v === "glasses") {
      const lx = (LENS_CENTER.x / 100) * cw;
      const ly = (LENS_CENTER.y / 100) * ch;
      return { scale, x: vw / 2 - lx * scale, y: vh / 2 - ly * scale };
    }
    return { scale, x: (vw - cw * scale) / 2, y: (vh - ch * scale) / 2 };
  }, []);

  const reset = useCallback(
    (v: View = view) => {
      const ds = defaultDeviceScale(v);
      deviceScaleRef.current = ds;
      setDeviceScale(ds);
      setT(computeDefault(v, ds));
    },
    [computeDefault, view],
  );

  // apply per-view default zoom + framing before paint (view toggle always lands here).
  useLayoutEffect(() => {
    const c = contentRef.current;
    if (!c) return;

    setRevealed(false);
    let frame = 0;

    const apply = () => {
      const ds = defaultDeviceScale(view);
      deviceScaleRef.current = ds;
      setDeviceScale(ds);
      setT(computeDefault(view, ds));
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
  }, [computeDefault, view]);

  // zoom about a viewport point, keeping the content point under it fixed
  const zoomAt = useCallback((clientX: number, clientY: number, factor: number) => {
    const vp = viewportRef.current;
    if (!vp) return;
    const r = vp.getBoundingClientRect();
    const px = clientX - r.left;
    const py = clientY - r.top;
    setT((cur) => {
      const cw = contentRef.current?.offsetWidth ?? 0;
      const v = viewRef.current;
      const nextDevice = clamp(deviceScaleFromPan(cur.scale, v, cw) * factor, SCALE_MIN, SCALE_MAX);
      deviceScaleRef.current = nextDevice;
      setDeviceScale(nextDevice);
      const scale = panScaleFromDevice(nextDevice, v, cw);
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

  const zoomCenterRef = useRef(zoomCenter);
  zoomCenterRef.current = zoomCenter;
  const resetRef = useRef(reset);
  resetRef.current = reset;

  const panShortcutRef = useRef({
    zoomIn: () => zoomCenterRef.current(BUTTON_STEP),
    zoomOut: () => zoomCenterRef.current(1 / BUTTON_STEP),
    reset: () => resetRef.current(),
  });

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
      setT((cur) => ({ ...cur, x: cur.x + dw / 2, y: cur.y + dh / 2 }));
    });
    ro.observe(vp);
    return () => ro.disconnect();
  });

  // if the content plane resizes (frames stage), retarget pan scale to hold deviceScale.
  useMountEffect(() => {
    const c = contentRef.current;
    if (!c) return;
    const ro = new ResizeObserver(() => {
      const cw = c.offsetWidth;
      if (!cw) return;
      setT((cur) => {
        const v = viewRef.current;
        const scale = panScaleFromDevice(deviceScaleRef.current, v, cw);
        if (scale === cur.scale) return cur;
        const vp = viewportRef.current;
        if (!vp) return { ...cur, scale };
        const px = vp.clientWidth / 2;
        const py = vp.clientHeight / 2;
        const k = scale / cur.scale;
        return { scale, x: px - (px - cur.x) * k, y: py - (py - cur.y) * k };
      });
    });
    ro.observe(c);
    return () => ro.disconnect();
  });

  const onPointerDown = useCallback((e: ReactPointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);
  const onPointerMove = useCallback((e: ReactPointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    drag.current = { x: e.clientX, y: e.clientY };
    setT((cur) => ({ ...cur, x: cur.x + dx, y: cur.y + dy }));
  }, []);
  const onPointerUp = useCallback((e: ReactPointerEvent) => {
    drag.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  }, []);

  return {
    viewportRef,
    contentRef,
    revealed,
    style: {
      transform: `translate(${t.x}px, ${t.y}px) scale(${t.scale})`,
      transformOrigin: "0 0",
    },
    scale: deviceScale,
    zoomIn: () => zoomCenter(BUTTON_STEP),
    zoomOut: () => zoomCenter(1 / BUTTON_STEP),
    reset,
    bind: { onPointerDown, onPointerMove, onPointerUp },
  };
}
