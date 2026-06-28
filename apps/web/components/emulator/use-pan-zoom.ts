"use client";

import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { LENS_CENTER } from "@/lib/emulator/config";
import type { View } from "@/lib/emulator/store";

const SCALE_MIN = 0.2;
const SCALE_MAX = 10;
const BUTTON_STEP = 1.25;

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

interface Transform {
  scale: number;
  x: number;
  y: number;
}

export interface PanZoom {
  viewportRef: RefObject<HTMLDivElement | null>;
  contentRef: RefObject<HTMLDivElement | null>;
  style: CSSProperties; // transform for the content; origin top-left
  scale: number;
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
  bind: {
    onPointerDown: (e: ReactPointerEvent) => void;
    onPointerMove: (e: ReactPointerEvent) => void;
    onPointerUp: (e: ReactPointerEvent) => void;
  };
}

// canvas pan/zoom over the device plane. drag pans; pinch / cmd-scroll zooms to the cursor;
// the buttons zoom about the viewport center. content is positioned at the viewport's
// top-left with origin 0 0, so screen = (x + localX*scale, y + localY*scale).
export function usePanZoom(view: View): PanZoom {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [t, setT] = useState<Transform>({ scale: 1, x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number } | null>(null);

  // per-view default: center the content; glasses centers the right-lens iframe midpoint
  // at 2× so ~half the frame crops off, fit scales the device to the viewport, 1:1 is actual.
  const computeDefault = useCallback((): Transform => {
    const vp = viewportRef.current;
    const c = contentRef.current;
    if (!vp || !c) return { scale: 1, x: 0, y: 0 };
    const vw = vp.clientWidth;
    const vh = vp.clientHeight;
    const cw = c.offsetWidth;
    const ch = c.offsetHeight;
    if (!cw || !ch) return { scale: 1, x: 0, y: 0 };
    if (view === "glasses") {
      const scale = 2;
      const lx = (LENS_CENTER.x / 100) * cw;
      const ly = (LENS_CENTER.y / 100) * ch;
      return { scale, x: vw / 2 - lx * scale, y: vh / 2 - ly * scale };
    }
    const scale = view === "fit" ? Math.min(vw / cw, vh / ch) * 0.92 : 1;
    return { scale, x: (vw - cw * scale) / 2, y: (vh - ch * scale) / 2 };
  }, [view]);

  const reset = useCallback(() => setT(computeDefault()), [computeDefault]);

  // (re)center on view change (content is re-laid-out by the time this effect runs)
  useEffect(() => {
    reset();
  }, [reset]);

  // zoom about a viewport point, keeping the content point under it fixed
  const zoomAt = useCallback((clientX: number, clientY: number, factor: number) => {
    const vp = viewportRef.current;
    if (!vp) return;
    const r = vp.getBoundingClientRect();
    const px = clientX - r.left;
    const py = clientY - r.top;
    setT((cur) => {
      const scale = clamp(cur.scale * factor, SCALE_MIN, SCALE_MAX);
      const k = scale / cur.scale;
      return { scale, x: px - (px - cur.x) * k, y: py - (py - cur.y) * k };
    });
  }, []);

  const zoomCenter = useCallback(
    (factor: number) => {
      const vp = viewportRef.current;
      if (!vp) return;
      const r = vp.getBoundingClientRect();
      zoomAt(r.left + r.width / 2, r.top + r.height / 2, factor);
    },
    [zoomAt],
  );

  // pinch (ctrlKey) / cmd-scroll = zoom to cursor; plain wheel = pan. native non-passive
  // listener so preventDefault works (react's onWheel is passive).
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.01));
      else setT((cur) => ({ ...cur, x: cur.x - e.deltaX, y: cur.y - e.deltaY }));
    };
    vp.addEventListener("wheel", onWheel, { passive: false });
    return () => vp.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  // keep the viewport center anchored on resize (don't left-align): shift the pan by half
  // the size delta so the world point under the center stays put, preserving the pan/zoom.
  useEffect(() => {
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
  }, []);

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
    style: {
      transform: `translate(${t.x}px, ${t.y}px) scale(${t.scale})`,
      transformOrigin: "0 0",
    },
    scale: t.scale,
    zoomIn: () => zoomCenter(BUTTON_STEP),
    zoomOut: () => zoomCenter(1 / BUTTON_STEP),
    reset,
    bind: { onPointerDown, onPointerMove, onPointerUp },
  };
}
