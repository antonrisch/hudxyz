"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Frames } from "@/components/frames";
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Grab, Undo2, RotateCw } from "lucide-react";

const IDLE_MS = 120_000; // release a remote session after 2 min idle (cost control)

// display placement over the right lens, as % of the frames container.
const RIGHT_LENS = { left: 64, top: 26, size: 17 };

// device + Browserbase session render size; keep in sync with createSession
const VIEWPORT = 600;

// keys the glasses emit; captured at the page level and forwarded to the session
const KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter", "Escape"];

type Status = "empty" | "loading" | "ready" | "ended" | "error" | "incompatible";

// "glasses" wraps the display in the frames SVG over the right lens; "bare" is a
// large 600×600 debug box. logic/controls are identical between the two.
export default function Emulator({ chrome = "glasses" }: { chrome?: "glasses" | "bare" }) {
  const [input, setInput] = useState("");
  const [src, setSrc] = useState("");
  const [status, setStatus] = useState<Status>("empty");
  const [scale, setScale] = useState(1);
  const sessionRef = useRef<string | null>(null);
  const idleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);

  // measure the display box and scale the fixed 600×600 surface to fill it
  const fitRef = useCallback((el: HTMLDivElement | null) => {
    roRef.current?.disconnect();
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / VIEWPORT));
    ro.observe(el);
    roRef.current = ro;
  }, []);

  // tear down the live Browserbase session (idle, new load, or tab close)
  const release = useCallback((keepalive = false) => {
    const id = sessionRef.current;
    sessionRef.current = null;
    if (idleRef.current) clearTimeout(idleRef.current);
    if (id) {
      fetch(`/api/emulator/session?id=${id}`, { method: "DELETE", keepalive }).catch(() => {});
    }
  }, []);

  const armIdle = useCallback(() => {
    if (idleRef.current) clearTimeout(idleRef.current);
    idleRef.current = setTimeout(() => {
      release();
      setStatus("ended");
    }, IDLE_MS);
  }, [release]);

  // every site runs in a Browserbase session so the on-screen d-pad works: a
  // clicked button can't inject keys into a cross-origin iframe, but the server can.
  const load = useCallback(
    async (raw: string) => {
      release();
      const url = raw.trim();
      if (!url) return;
      setSrc("");
      setStatus("loading");
      try {
        const res = await fetch("/api/emulator/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        if (res.status === 422) {
          setStatus("incompatible");
          return;
        }
        if (!res.ok) throw new Error(await res.text());
        const { sessionId, liveViewUrl } = await res.json();
        sessionRef.current = sessionId;
        setSrc(liveViewUrl);
        setStatus("ready");
        armIdle();
      } catch {
        setStatus("error");
      }
    },
    [release, armIdle],
  );

  // deep-link: ?url=... prefills and loads
  useEffect(() => {
    const u = new URLSearchParams(window.location.search).get("url");
    if (u) {
      setInput(u);
      load(u);
    }
  }, [load]);

  // release the session if the tab goes away
  useEffect(() => {
    const onHide = () => release(true);
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      release();
    };
  }, [release]);

  // dispatch a d-pad key into the session server-side (see api/emulator/input).
  // used by both the on-screen buttons and the page-level keyboard capture below.
  const sendKey = useCallback(
    (key: string) => {
      const id = sessionRef.current;
      if (!id) return;
      armIdle();
      fetch("/api/emulator/input", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: id, key }),
      })
        .then((r) => {
          if (!r.ok) console.warn("[emulator] input", key, r.status);
        })
        .catch((e) => console.warn("[emulator] input error", e));
    },
    [armIdle],
  );

  // forward physical keys to the session even when the live view isn't focused
  // (focused -> the live view forwards them itself, so the parent never sees them).
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
            src={src}
            title="Glasses display"
            sandbox="allow-same-origin allow-scripts"
            allow="clipboard-read; clipboard-write"
            className="size-full border-0 bg-black"
          />
        </div>
      </div>
    ) : (
      <div className="grid size-full place-items-center bg-black/80 px-2 text-center text-[10px] leading-tight text-white/70">
        {status === "loading" && "Starting session…"}
        {status === "incompatible" && "Not MRBD-compatible (no mrbd-web-app-capable tag)"}
        {status === "ended" && "Idle — press Reload to resume"}
        {status === "error" && "Couldn't load. Reload to retry."}
      </div>
    );

  return (
    <div className="flex flex-col items-center gap-6 p-8">
      {/* url bar — any site, gated server-side by MRBD-compatibility */}
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
        <Button type="submit" variant="outline">
          Load
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Reload"
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
          <span />
          <Button variant="outline" size="icon" aria-label="Swipe up" onClick={() => sendKey("ArrowUp")}>
            <ArrowUp />
          </Button>
          <span />
          <Button variant="outline" size="icon" aria-label="Swipe left" onClick={() => sendKey("ArrowLeft")}>
            <ArrowLeft />
          </Button>
          <Button variant="outline" size="icon" aria-label="Pinch (select)" onClick={() => sendKey("Enter")}>
            <Grab />
          </Button>
          <Button variant="outline" size="icon" aria-label="Swipe right" onClick={() => sendKey("ArrowRight")}>
            <ArrowRight />
          </Button>
          <span />
          <Button variant="outline" size="icon" aria-label="Swipe down" onClick={() => sendKey("ArrowDown")}>
            <ArrowDown />
          </Button>
          <span />
        </div>
        <Button variant="outline" size="icon" aria-label="Back" onClick={() => sendKey("Escape")}>
          <Undo2 />
        </Button>
      </div>
    </div>
  );
}
