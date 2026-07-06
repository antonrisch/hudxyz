"use client";

import { useState } from "react";
import { useQueryState } from "nuqs";
import { RotateCw, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSimulator, useSimulatorState } from "@/components/simulator";
import { DIRECTORY_MAILTO } from "@/lib/simulator/config";
import { SUGGESTED_APPS } from "@/lib/simulator/config";
import { simulatorParsers, normalizeWebUrl } from "@/lib/simulator/search-params";
import { dropFocus } from "@/lib/simulator/input";
import { cn } from "@/lib/utils";

// address bar: a plain url input + an attached load/reload group, like a browser.
export function UrlBar({ className }: { className?: string }) {
  const { store, load, urlInputRef } = useSimulator();
  const url = useSimulatorState((s) => s.url);
  const [, setUrlParam] = useQueryState("url", simulatorParsers.url);
  const [reloadSpin, setReloadSpin] = useState(0);

  const submitUrl = (rawUrl: string) => {
    const nextUrl = normalizeWebUrl(rawUrl);
    if (!nextUrl) {
      toast.message("Enter a web app URL like https://example.com");
      urlInputRef.current?.focus();
      return false;
    }

    store.getState().setUrl(nextUrl);
    load(nextUrl);
    void setUrlParam(nextUrl);
    (document.activeElement as HTMLElement | null)?.blur();
    return true;
  };

  const selectUrl = (nextUrl: string) => {
    submitUrl(nextUrl);
  };

  return (
    <div className={cn("group relative min-w-0 w-full max-w-full", className)}>
      <div className="overflow-hidden rounded-xl border bg-muted hover:bg-input/80 focus-within:bg-muted focus-within:hover:bg-muted group-focus-within:rounded-b-none group-focus-within:border-b-transparent">
        <form
          className="flex min-w-0 items-center sm:gap-1 p-0.5"
          onSubmit={(e) => {
            e.preventDefault();
            submitUrl(url);
          }}
        >
          <Input
            ref={urlInputRef}
            value={url}
            onChange={(e) => store.getState().setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }}
            placeholder="Enter any URL (e.g. https://my-mrbd-app.com)"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            className="min-w-0 w-full border-none focus-visible:border-transparent focus-visible:ring-0"
          />
          <div className="flex">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Clear"
              className="sm:flex hidden"
              onMouseDown={dropFocus}
              onClick={() => {
                store.getState().setUrl("");
                void setUrlParam(null);
                urlInputRef.current?.focus();
              }}
            >
              <X />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Reload"
              onMouseDown={dropFocus}
              onClick={() => {
                if (submitUrl(url)) setReloadSpin((n) => n + 1);
              }}
            >
              <RotateCw
                key={reloadSpin}
                className="motion-safe:animate-[spin_0.45s_ease-in-out_1]"
              />
            </Button>
          </div>
        </form>
      </div>

      <div className="pointer-events-none absolute top-full right-0 left-0 z-50 hidden overflow-hidden rounded-b-xl border-border border-b border-l border-r bg-muted group-focus-within:pointer-events-auto group-focus-within:block">
        <div className="p-1">
          {SUGGESTED_APPS.map((app) => (
            <div key={app.url} className="flex items-center rounded-lg hover:bg-input">
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-left text-sm"
                onMouseDown={dropFocus}
                onClick={() => selectUrl(app.url)}
              >
                <img src={app.iconUrl} alt="" className="size-5 shrink-0 rounded-sm object-cover" />
                <div className="flex min-w-0 flex-1 items-center gap-1.5">
                  <span className="shrink-0">{app.name}</span>
                  <span title={app.url} className="max-w-48 truncate text-muted-foreground">
                    {app.url}
                  </span>
                </div>
              </button>
            </div>
          ))}
        </div>
        <p className="border-t border-border px-3 py-2 text-xs leading-snug text-muted-foreground">
          Know an app we should add?{" "}
          <a
            href={DIRECTORY_MAILTO}
            className="font-medium text-foreground hover:underline underline-offset-4"
            onMouseDown={dropFocus}
          >
            Request
          </a>
        </p>
      </div>
    </div>
  );
}
