"use client";

import type { MouseEvent } from "react";
import { ArrowUpRight, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ButtonGroup } from "@/components/ui/button-group";
import { useEmulator, useEmulatorState } from "@/components/emulator";
import { SUGGESTED_APPS } from "@/lib/emulator/config";

// keep controls from taking focus so physical d-pad keys stay live
const dropFocus = (e: MouseEvent) => e.preventDefault();

// address bar: a plain url input + an attached load/reload group, like a browser.
export function UrlBar() {
  const { store, load } = useEmulator();
  const url = useEmulatorState((s) => s.url);

  const selectUrl = (nextUrl: string) => {
    store.getState().setUrl(nextUrl);
    load(nextUrl);
    (document.activeElement as HTMLElement | null)?.blur();
  };

  return (
    <div className="group relative w-150">
      <div className="overflow-hidden rounded-xl border bg-muted group-focus-within:rounded-b-none group-focus-within:border-b-transparent">
        <form
          className="flex items-center gap-1 p-0.5"
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
      </div>

      <div className="pointer-events-none absolute top-full right-0 left-0 z-50 hidden overflow-hidden rounded-b-xl border-border border-b border-l border-r p-1 bg-muted group-focus-within:pointer-events-auto group-focus-within:block">
        {SUGGESTED_APPS.map((app) => (
          <div
            key={app.url}
            className="flex items-center rounded-lg hover:bg-input"
          >
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-left text-sm"
              onMouseDown={dropFocus}
              onClick={() => selectUrl(app.url)}
            >
              <img
                src={app.iconUrl}
                alt=""
                className="size-5 shrink-0 rounded-sm object-cover"
              />
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <span className="shrink-0">{app.name}</span>
                <span title={app.url} className="max-w-40 truncate text-muted-foreground">
                  {app.url}
                </span>
              </div>
            </button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="mr-1 shrink-0 transition-none"
              aria-label={`Open ${app.name} in a new tab`}
              onMouseDown={dropFocus}
              onClick={() => window.open(app.url, "_blank", "noopener,noreferrer")}
            >
              <ArrowUpRight />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
