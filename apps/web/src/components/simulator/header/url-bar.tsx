"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import { Command as CommandPrimitive } from "cmdk";
import { History, LayoutGrid, RotateCw, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CommandGroup, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { useSimulator, useSimulatorState } from "@/components/simulator";
import type { SuggestedHub } from "@/lib/simulator/config";
import { simulatorParsers, normalizeWebUrl } from "@/lib/simulator/search-params";
import { dropFocus } from "@/lib/simulator/input";
import { pushRecentApp, readRecentApps, type RecentApp } from "@/lib/simulator/recents";
import { suggestedHubNameForUrl } from "@/lib/simulator/suggested-hubs";
import { useMountEffect } from "@/lib/use-mount-effect";
import type { SimulatorLoadTrigger } from "@/lib/analytics/events";
import { cn } from "@/lib/utils";

function hostnameLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

const VIEW_ALL_VALUE = "view-all-hubs";
// A cmdk value no item uses. Keeps the list mounted with nothing highlighted:
// cmdk only auto-selects the first row when its value is falsy, so a non-empty
// sentinel both suppresses the mount-time highlight and stays in sync with our state.
const NO_SELECTION = "\0";

function suggestionValue(kind: "recent" | "popular", url: string) {
  return `${kind}:${url}`;
}

// address bar: cmdk for ↑/↓/Enter row nav, chrome styled like a browser field.
export function UrlBar({
  className,
  suggestedHubs,
}: {
  className?: string;
  suggestedHubs: SuggestedHub[];
}) {
  const router = useRouter();
  const { store, load, urlInputRef } = useSimulator();
  const url = useSimulatorState((s) => s.url);
  const [, setUrlParam] = useQueryState("url", simulatorParsers.url);
  const [reloadSpin, setReloadSpin] = useState(0);
  const [recents, setRecents] = useState<RecentApp[]>([]);
  // controlled cmdk selection; NO_SELECTION = nothing highlighted, so Enter submits the typed URL.
  const [selected, setSelected] = useState(NO_SELECTION);

  // localStorage is client-only; seed after mount to stay hydration-safe.
  useMountEffect(() => setRecents(readRecentApps()));

  const recordRecent = (nextUrl: string) => {
    const name = suggestedHubNameForUrl(nextUrl, suggestedHubs) || hostnameLabel(nextUrl);
    setRecents(pushRecentApp({ url: nextUrl, name }));
  };

  const clearSelection = () => setSelected(NO_SELECTION);
  const hasSelection = selected !== NO_SELECTION;

  const submitUrl = (rawUrl: string, trigger: SimulatorLoadTrigger = "typed") => {
    const nextUrl = normalizeWebUrl(rawUrl);
    if (!nextUrl) {
      toast.message("Enter a web app URL like https://example.com");
      urlInputRef.current?.focus();
      return false;
    }

    store.getState().setUrl(nextUrl);
    load(nextUrl, { trigger });
    void setUrlParam(nextUrl);
    recordRecent(nextUrl);
    clearSelection();
    (document.activeElement as HTMLElement | null)?.blur();
    return true;
  };

  const selectUrl = (nextUrl: string, trigger: SimulatorLoadTrigger) => {
    submitUrl(nextUrl, trigger);
  };

  const selectViewAll = () => {
    clearSelection();
    (document.activeElement as HTMLElement | null)?.blur();
    router.push("/hubs");
  };

  const hasSuggestions = recents.length > 0 || suggestedHubs.length > 0;

  const itemClassName =
    "gap-2 rounded-lg px-2 py-2 data-selected:bg-input data-selected:text-foreground";

  return (
    <CommandPrimitive
      shouldFilter={false}
      loop
      value={selected}
      onValueChange={(next) => setSelected(next || NO_SELECTION)}
      onKeyDown={(e) => {
        // no row highlighted → Enter loads the typed URL; cmdk handles Enter on a row.
        if (e.key === "Enter" && !hasSelection) {
          e.preventDefault();
          submitUrl(url);
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          if (hasSelection) {
            clearSelection();
            return;
          }
          urlInputRef.current?.blur();
        }
      }}
      onBlur={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        clearSelection();
      }}
      className={cn("group relative min-w-0 w-full max-w-full", className)}
    >
      <div className="overflow-hidden rounded-xl border bg-muted hover:bg-input/80 focus-within:bg-muted focus-within:hover:bg-muted group-focus-within:rounded-b-none group-focus-within:border-b-transparent">
        <div className="flex min-w-0 items-center sm:gap-1 p-0.5">
          {/* Plain input, not CommandPrimitive.Input: we never want cmdk to treat the
              typed URL as a search query (it would re-highlight the first row on every
              keystroke). cmdk's root still owns ↑/↓/Enter for the rows below. */}
          <Input
            ref={urlInputRef}
            role="combobox"
            aria-expanded
            aria-controls="url-bar-suggestions"
            aria-autocomplete="list"
            value={url}
            onChange={(e) => {
              store.getState().setUrl(e.target.value);
              clearSelection();
            }}
            placeholder="Enter any URL (e.g. https://my-mrbd-app.com)"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            className="min-w-0 w-full border-none bg-transparent dark:bg-transparent focus-visible:border-transparent focus-visible:ring-0"
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
                clearSelection();
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
                if (submitUrl(url, "reload")) setReloadSpin((n) => n + 1);
              }}
            >
              <RotateCw
                key={reloadSpin}
                className="motion-safe:animate-[spin_0.45s_ease-in-out_1]"
              />
            </Button>
          </div>
        </div>
      </div>

      <CommandList
        id="url-bar-suggestions"
        label="URL suggestions"
        className="pointer-events-none absolute top-full right-0 left-0 z-50 hidden max-h-none overflow-hidden rounded-b-xl border-border border-b border-l border-r bg-muted p-1 group-focus-within:pointer-events-auto group-focus-within:block"
      >
        {recents.length > 0 ? (
          <CommandGroup className="p-0 **:[[cmdk-group-heading]]:hidden">
            {recents.map((app) => (
              <CommandItem
                key={suggestionValue("recent", app.url)}
                value={suggestionValue("recent", app.url)}
                onSelect={() => selectUrl(app.url, "recent")}
                className={itemClassName}
              >
                <History className="size-5 shrink-0 text-muted-foreground" />
                <span className="shrink-0">{app.name}</span>
                <span title={app.url} className="max-w-48 truncate text-muted-foreground">
                  {app.url}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}

        {suggestedHubs.length > 0 ? (
          <>
            {recents.length > 0 ? <CommandSeparator alwaysRender className="mx-1 my-1" /> : null}
            <CommandGroup heading="Popular hubs" className="p-0">
              {suggestedHubs.map((hub) => (
                <CommandItem
                  key={suggestionValue("popular", hub.url)}
                  value={suggestionValue("popular", hub.url)}
                  onSelect={() => selectUrl(hub.url, "popular")}
                  className={itemClassName}
                >
                  {hub.iconUrl ? (
                    <img
                      src={hub.iconUrl}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="size-5 shrink-0 rounded-sm object-cover"
                    />
                  ) : (
                    <span className="size-5 shrink-0 rounded-sm bg-muted-foreground/20" />
                  )}
                  <span className="shrink-0">{hub.name}</span>
                  <span title={hub.url} className="max-w-48 truncate text-muted-foreground">
                    {hub.url}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        ) : null}

        {hasSuggestions ? <CommandSeparator alwaysRender className="mx-1 my-1" /> : null}
        <CommandItem value={VIEW_ALL_VALUE} onSelect={selectViewAll} className={itemClassName}>
          <LayoutGrid className="size-5 shrink-0 fill-brand-dark text-brand-dark" />
          Browse community hubs
        </CommandItem>
      </CommandList>
    </CommandPrimitive>
  );
}
