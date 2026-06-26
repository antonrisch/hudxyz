"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Frames } from "@/components/frames";
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Grab, Undo2, RotateCw } from "lucide-react";

// cross-origin iframes can't receive injected key events, so we post the gesture
// and the embedded app opts in by listening (Lenswolf lenses do via lib/dpad).
const GESTURE_SOURCE = "lenswolf-emulator";

// display placement over the right lens, as % of the frames container so it stays
// correct at any zoom/size. size is % of container width; locked square (600x600).
const RIGHT_LENS = { left: 64, top: 26, size: 17 };

export default function Emulator() {
  const [input, setInput] = useState("");
  const [src, setSrc] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // deep-link: ?url=... prefills and loads
  useEffect(() => {
    const u = new URLSearchParams(window.location.search).get("url");
    if (u) {
      setInput(u);
      setSrc(u);
    }
  }, []);

  const load = () => setSrc(input.trim());
  const reload = () => setReloadKey((k) => k + 1);
  const press = (key: string) =>
    iframeRef.current?.contentWindow?.postMessage(
      { source: GESTURE_SOURCE, type: "gesture", key },
      "*",
    );

  return (
    <div className="flex flex-col items-center gap-6 p-8">
      {/* url bar */}
      <form
        className="flex w-150 gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="http://localhost:4321/speedometer"
        />
        <Button type="submit" variant="outline">Load</Button>
        <Button type="button" variant="outline" size="icon" aria-label="Reload" onClick={reload}>
          <RotateCw />
        </Button>
      </form>

      {/* glasses frames with the display embedded in the right lens */}
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
          {src ? (
            <iframe
              key={reloadKey}
              ref={iframeRef}
              src={src}
              title="Glasses display"
              className="size-full border-0 bg-black"
              allow="geolocation; accelerometer; gyroscope; magnetometer"
            />
          ) : (
            <div className="size-full bg-black/80" />
          )}
        </div>
      </div>

      {/* gesture controls: d-pad swipe (UDLR) + pinch (select) + back */}
      <div className="flex items-center gap-8">
        <div className="grid grid-cols-3 gap-2">
          <span />
          <Button
            variant="outline"
            size="icon"
            aria-label="Swipe up"
            onClick={() => press("ArrowUp")}
          >
            <ArrowUp />
          </Button>
          <span />
          <Button
            variant="outline"
            size="icon"
            aria-label="Swipe left"
            onClick={() => press("ArrowLeft")}
          >
            <ArrowLeft />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Pinch (select)"
            onClick={() => press("Enter")}
          >
            <Grab />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Swipe right"
            onClick={() => press("ArrowRight")}
          >
            <ArrowRight />
          </Button>
          <span />
          <Button
            variant="outline"
            size="icon"
            aria-label="Swipe down"
            onClick={() => press("ArrowDown")}
          >
            <ArrowDown />
          </Button>
          <span />
        </div>
        <Button variant="outline" size="icon" aria-label="Back" onClick={() => press("Escape")}>
          <Undo2 />
        </Button>
      </div>
    </div>
  );
}
