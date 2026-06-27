"use client";

import { type MouseEvent, useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Frames } from "@/components/frames";
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Grab, Undo2, RotateCw } from "lucide-react";
import { encodeUrl } from "@/lib/proxy";

// display placement over the right lens, as % of the frames container.
const RIGHT_LENS = { left: 64, top: 26, size: 17 };

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

type Status = "empty" | "loading" | "ready" | "error";

const MSG: Partial<Record<Status, string>> = {
  loading: "Loading…",
  error: "Couldn't load. Reload to retry.",
};

// "glasses" embeds the display in the right lens; "bare" is a raw 600×600 debug box.
export default function Emulator({ chrome = "glasses" }: { chrome?: "glasses" | "bare" }) {
  const [input, setInput] = useState("");
  const [src, setSrc] = useState("");
  const [status, setStatus] = useState<Status>("empty");
  const [scale, setScale] = useState(1);
  const iframeRef = useRef<HTMLIFrameElement>(null);
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
    setStatus("loading");
    try {
      setSrc(await encodeUrl(url));
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  // deep-link: ?url=... prefills and loads
  useEffect(() => {
    const u = new URLSearchParams(window.location.search).get("url");
    if (u) {
      setInput(u);
      load(u);
    }
  }, [load]);

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

  // 600×600 surface scaled to fit its box so it's never cut off; overlay renders
  // at box size since it's chrome, not device content.
  const display =
    src && status === "ready" ? (
      <div ref={fitRef} className="relative size-full overflow-hidden bg-black">
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{ width: VIEWPORT, height: VIEWPORT, transform: `scale(${scale})` }}
        >
          <iframe
            ref={iframeRef}
            src={src}
            title="Glasses display"
            allow="clipboard-read; clipboard-write"
            className="size-full border-0 bg-black"
          />
        </div>
      </div>
    ) : (
      <div className="grid size-full place-items-center bg-black/80 px-2 text-center text-[10px] leading-tight text-white/70">
        {MSG[status]}
      </div>
    );

  return (
    <div className="flex flex-col items-center gap-6 p-8">
      {/* url bar */}
      <form
        className="flex w-150 gap-2"
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
      </form>

      {chrome === "glasses" ? (
        // display embedded in the right lens of the frames SVG
        <div className="relative w-full max-w-240">
          <Frames className="block h-auto w-full" />
          <div
            className="absolute overflow-hidden"
            style={{
              left: `${RIGHT_LENS.left}%`,
              top: `${RIGHT_LENS.top}%`,
              width: `${RIGHT_LENS.size}%`,
              aspectRatio: "1 / 1",
            }}
          >
            {display}
          </div>
        </div>
      ) : (
        // large unobstructed 600×600 box for debugging
        <div className="size-150 overflow-hidden border border-black/15 bg-black">{display}</div>
      )}

      {/* gesture controls: d-pad (UDLR) + pinch (select) + back */}
      <div className="flex items-center gap-8">
        <div className="grid grid-cols-3 gap-2">
          {PAD.map((c, i) =>
            c ? (
              <Button
                key={c.key}
                variant="outline"
                size="icon"
                aria-label={c.label}
                onMouseDown={dropFocus}
                onClick={() => sendKey(c.key)}
              >
                <c.Icon />
              </Button>
            ) : (
              <span key={i} />
            ),
          )}
        </div>
        <Button
          variant="outline"
          size="icon"
          aria-label="Back"
          onMouseDown={dropFocus}
          onClick={() => sendKey("Escape")}
        >
          <Undo2 />
        </Button>
      </div>
    </div>
  );
}
