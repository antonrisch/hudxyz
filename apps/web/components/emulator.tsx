"use client";

import {
  type CSSProperties,
  type MouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ButtonGroup } from "@/components/ui/button-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Frames } from "@/components/frames";
import { cn } from "@/lib/utils";
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Grab, Undo2, RotateCw } from "lucide-react";
import { createFrame } from "@/lib/proxy";
import type { Frame } from "@mercuryworkshop/scramjet-controller";

// display placement over the right lens, as % of the frames container.
const RIGHT_LENS = { left: 63.75, top: 28, size: 17 };

// device render size (matches the glasses surface)
const VIEWPORT = 600;

// keys the glasses emit; captured at the page level and injected into the frame
const KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter", "Escape"];

// 3x3 d-pad grid; null = spacer. order: up / left·pinch·right / down
const PAD = [
  null,
  { key: "ArrowUp", Icon: ArrowUp, label: "Swipe up" },
  null,
  { key: "ArrowLeft", Icon: ArrowLeft, label: "Swipe left" },
  { key: "Enter", Icon: Grab, label: "Pinch (select)" },
  { key: "ArrowRight", Icon: ArrowRight, label: "Swipe right" },
  null,
  { key: "ArrowDown", Icon: ArrowDown, label: "Swipe down" },
  null,
] as const;

// cosmetic presentation modes; all wrap the SAME persistent device surface.
// glasses: framed over the lens. fit: scaled to fill the area. 1:1: exact 600×600.
const VIEWS = [
  { key: "glasses", label: "Glasses" },
  { key: "fit", label: "Fit" },
  { key: "actual", label: "1:1" },
] as const;
type View = (typeof VIEWS)[number]["key"];
const VIEW_KEYS = VIEWS.map((v) => v.key);

// per-view chrome around the device slot. only the className/style change between
// views, so the iframe it wraps stays the same element (no proxy reload).
const SLOT: Record<View, { className: string; style?: CSSProperties }> = {
  glasses: {
    className: "absolute overflow-hidden",
    style: {
      left: `${RIGHT_LENS.left}%`,
      top: `${RIGHT_LENS.top}%`,
      width: `${RIGHT_LENS.size}%`,
      aspectRatio: "1 / 1",
      borderRadius: 6,
    },
  },
  fit: {
    // fills the leftover space (see #hud-device flex-1 below); square, capped to width
    className: "h-full aspect-square max-w-full overflow-hidden border border-border bg-black",
  },
  actual: {
    className: "relative mx-auto size-150 overflow-hidden border border-border bg-black",
  },
};

type Status = "empty" | "loading" | "ready" | "error";

const MSG: Partial<Record<Status, string>> = {
  loading: "Loading…",
  error: "Couldn't load. Reload to retry.",
};

export default function Emulator() {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<Status>("empty");
  const [view, setView] = useState<View>("glasses");
  const [scale, setScale] = useState(1);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const frameRef = useRef<Frame | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);

  // measure the display box and scale the fixed 600×600 surface to fill it
  const fitRef = useCallback((el: HTMLDivElement | null) => {
    roRef.current?.disconnect();
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / VIEWPORT));
    ro.observe(el);
    roRef.current = ro;
  }, []);

  // route the target through the same-origin proxy so framing-blocked sites load
  // and keys can be injected client-side.
  const load = useCallback(async (raw: string) => {
    const url = raw.trim();
    if (!/^https?:\/\//i.test(url)) return;
    const el = iframeRef.current;
    if (!el) return;
    setStatus("loading");
    try {
      // create the frame once for our iframe, then navigate (v2 has no encodeUrl)
      const frame = (frameRef.current ??= await createFrame(el));
      frame.go(url);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  // deep-link on mount: ?view=... selects the chrome, ?url=... prefills and loads
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const v = p.get("view");
    if (v && VIEW_KEYS.includes(v as View)) setView(v as View);
    const u = p.get("url");
    if (u) {
      setInput(u);
      load(u);
    }
  }, [load]);

  // switch the cosmetic view and reflect it in the url client-side (no navigation,
  // so the proxy frame is untouched). preserve other params like ?url=.
  const selectView = useCallback((v: View) => {
    setView(v);
    const p = new URLSearchParams(window.location.search);
    if (v === "glasses")
      p.delete("view"); // default view keeps the url clean
    else p.set("view", v);
    const qs = p.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, []);

  // inject a d-pad key into the same-origin proxied frame. build the event in the
  // frame's realm so the page's listeners accept it; dispatch on its document.
  const sendKey = useCallback((key: string) => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    try {
      const Ev = (win as Window & { KeyboardEvent: typeof KeyboardEvent }).KeyboardEvent;
      win.document.dispatchEvent(new Ev("keydown", { key, bubbles: true, cancelable: true }));
    } catch {
      // frame not loaded / not same-origin yet
    }
  }, []);

  // forward physical keys to the frame even when it isn't focused
  // (focused -> the frame gets them natively, so the parent never sees them).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!KEYS.includes(e.key)) return;
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "BUTTON") return;
      e.preventDefault();
      sendKey(e.key);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sendKey]);

  // keep control buttons from taking focus on click so physical d-pad keys stay live
  const dropFocus = (e: MouseEvent) => e.preventDefault();

  // 600×600 surface scaled to fit its box; the iframe stays mounted so the controller
  // frame can attach to it. status overlay sits on top until the navigation is ready.
  const display = (
    <div ref={fitRef} className="relative size-full overflow-hidden bg-black">
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{ width: VIEWPORT, height: VIEWPORT, transform: `scale(${scale})` }}
      >
        <iframe
          ref={iframeRef}
          title="Glasses display"
          allow="clipboard-read; clipboard-write"
          className="size-full border-0 bg-black"
        />
      </div>
      {status !== "ready" && (
        <div className="absolute inset-0 grid place-items-center bg-black/80 px-2 text-center text-[10px] leading-tight text-white/70">
          {MSG[status]}
        </div>
      )}
    </div>
  );

  const slot = SLOT[view];

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-6 p-8",
        // fit fills the viewport remainder under the header so the device never scrolls
        view === "fit" && "h-[calc(100svh-var(--header-h))] w-full",
      )}
    >
      {/* url bar: plain address input + an attached load/reload group, like a browser */}
      <form
        className="flex w-150 items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          load(input);
        }}
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="https://your-mrbd-web-app.com"
        />
        <ButtonGroup>
          <Button type="submit" variant="outline" onMouseDown={dropFocus}>
            Load
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Reload"
            onMouseDown={dropFocus}
            onClick={() => load(input)}
          >
            <RotateCw />
          </Button>
        </ButtonGroup>
      </form>

      {/* view modes: shadcn toggle group; swaps only the chrome around the persistent device */}
      <ToggleGroup
        variant="default"
        aria-label="Display view"
        value={[view]}
        onValueChange={(vals) => {
          const next = vals[0];
          if (next) selectView(next as View); // ignore deselect so a view is always active
        }}
        className="p-1 border rounded-xl"
      >
        {VIEWS.map((v) => (
          <ToggleGroupItem key={v.key} value={v.key} onMouseDown={dropFocus} className="px-4">
            {v.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {/* one persistent device surface; the view only changes the chrome/sizing around it.
          glasses renders the frames svg as a backdrop, with the slot absolute over the lens. */}
      <div
        id="hud-device"
        className={cn(
          "relative w-full max-w-240",
          // fit: absorb the column's leftover height so the slot (h-full) has room to fill
          view === "fit" && "flex min-h-0 flex-1 items-center justify-center",
        )}
      >
        {view === "glasses" && <Frames className="block h-auto w-full" />}
        <div className={slot.className} style={slot.style}>
          {display}
        </div>
      </div>

      {/* gesture controls: d-pad (UDLR) + pinch (select) + back */}
      <TooltipProvider delay={300}>
        <div className="flex items-center gap-8">
          <div className="grid grid-cols-3 gap-2">
            {PAD.map((c, i) =>
              c ? (
                <Tooltip key={c.key}>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label={c.label}
                        onMouseDown={dropFocus}
                        onClick={() => sendKey(c.key)}
                      >
                        <c.Icon />
                      </Button>
                    }
                  />
                  <TooltipContent>{c.label}</TooltipContent>
                </Tooltip>
              ) : (
                <span key={i} />
              ),
            )}
          </div>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Back"
                  onMouseDown={dropFocus}
                  onClick={() => sendKey("Escape")}
                >
                  <Undo2 />
                </Button>
              }
            />
            <TooltipContent>Back</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  );
}
