"use client";

import type { MouseEvent } from "react";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ButtonGroup } from "@/components/ui/button-group";
import { useEmulator, useEmulatorState } from "@/components/emulator";

// keep controls from taking focus so physical d-pad keys stay live
const dropFocus = (e: MouseEvent) => e.preventDefault();

// address bar: a plain url input + an attached load/reload group, like a browser.
export function UrlBar() {
  const { store, load } = useEmulator();
  const url = useEmulatorState((s) => s.url);

  return (
    <form
      className="flex w-150 items-center gap-1 bg-muted p-0.5 border rounded-xl"
      onSubmit={(e) => {
        e.preventDefault();
        load(url);
      }}
    >
      <Input
        value={url}
        onChange={(e) => store.getState().setUrl(e.target.value)}
        placeholder="https://your-mrbd-web-app.com"
        className="border-none"
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
          onClick={() => {
            if (url.trim()) load(url);
          }}
        >
          <RotateCw />
        </Button>
      </ButtonGroup>
    </form>
  );
}
