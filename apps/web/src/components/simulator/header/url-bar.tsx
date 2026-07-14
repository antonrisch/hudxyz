"use client";

import { type ReactNode, useState } from "react";
import Link from "next/link";
import { useQueryState } from "nuqs";
import { History, LayoutGrid, RotateCw, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useSimulator, useSimulatorState } from "@/components/simulator";
import type { SuggestedApp } from "@/lib/simulator/config";
import { simulatorParsers, normalizeWebUrl } from "@/lib/simulator/search-params";
import { dropFocus } from "@/lib/simulator/input";
import { pushRecentApp, readRecentApps, type RecentApp } from "@/lib/simulator/recents";
import { useMountEffect } from "@/lib/use-mount-effect";
import { cn } from "@/lib/utils";

function hostnameLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="px-2 pt-1 pb-0.5 text-xs font-medium text-muted-foreground">{children}</p>;
}

// one dropdown row: leading media + name (+ optional url). button by default, link when href is set.
function SuggestionRow({
  leading,
  name,
  url,
  href,
  onSelect,
}: {
  leading: ReactNode;
  name: string;
  url?: string;
  href?: string;
  onSelect?: () => void;
}) {
  const className = "flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-left text-sm";
  const body = (
    <>
      {leading}
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <span className="shrink-0">{name}</span>
        {url ? (
          <span title={url} className="max-w-48 truncate text-muted-foreground">
            {url}
          </span>
        ) : null}
      </div>
    </>
  );

  return (
    <div className="flex items-center rounded-lg hover:bg-input">
      {href ? (
        <Link href={href} className={className} onMouseDown={dropFocus}>
          {body}
        </Link>
      ) : (
        <button type="button" className={className} onMouseDown={dropFocus} onClick={onSelect}>
          {body}
        </button>
      )}
    </div>
  );
}

// address bar: a plain url input + an attached load/reload group, like a browser.
export function UrlBar({
  className,
  suggestedApps,
}: {
  className?: string;
  suggestedApps: SuggestedApp[];
}) {
  const { store, load, urlInputRef } = useSimulator();
  const url = useSimulatorState((s) => s.url);
  const [, setUrlParam] = useQueryState("url", simulatorParsers.url);
  const [reloadSpin, setReloadSpin] = useState(0);
  const [recents, setRecents] = useState<RecentApp[]>([]);

  // localStorage is client-only; seed after mount to stay hydration-safe.
  useMountEffect(() => setRecents(readRecentApps()));

  const recordRecent = (nextUrl: string) => {
    const name = suggestedApps.find((app) => app.url === nextUrl)?.name ?? hostnameLabel(nextUrl);
    setRecents(pushRecentApp({ url: nextUrl, name }));
  };

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
    recordRecent(nextUrl);
    (document.activeElement as HTMLElement | null)?.blur();
    return true;
  };

  const selectUrl = (nextUrl: string) => {
    submitUrl(nextUrl);
  };

  const hasSuggestions = recents.length > 0 || suggestedApps.length > 0;

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
          {recents.length > 0 ? (
            <>
              {recents.map((app) => (
                <SuggestionRow
                  key={app.url}
                  leading={<History className="size-5 shrink-0 text-muted-foreground" />}
                  name={app.name}
                  url={app.url}
                  onSelect={() => selectUrl(app.url)}
                />
              ))}
            </>
          ) : null}

          {suggestedApps.length > 0 ? (
            <>
              {recents.length > 0 ? (
                <Separator className="mx-1 my-1 data-horizontal:w-auto" />
              ) : null}
              <SectionLabel>Popular apps</SectionLabel>
              {suggestedApps.map((app) => (
                <SuggestionRow
                  key={app.url}
                  leading={
                    app.iconUrl ? (
                      <img
                        src={app.iconUrl}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="size-5 shrink-0 rounded-sm object-cover"
                      />
                    ) : (
                      <span className="size-5 shrink-0 rounded-sm bg-muted-foreground/20" />
                    )
                  }
                  name={app.name}
                  url={app.url}
                  onSelect={() => selectUrl(app.url)}
                />
              ))}
            </>
          ) : null}

          {hasSuggestions ? <Separator className="mx-1 my-1 data-horizontal:w-auto" /> : null}
          <SuggestionRow
            leading={<LayoutGrid className="size-5 shrink-0 fill-brand-dark text-brand-dark" />}
            name="View all apps & games"
            href="/apps"
          />
        </div>
      </div>
    </div>
  );
}
