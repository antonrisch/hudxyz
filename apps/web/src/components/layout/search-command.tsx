"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, type ReactNode } from "react";

import { SpiralLoader } from "@/components/icons/spiral-loader";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { parseApiError } from "@/lib/hubs/api-error";
import type { HubListItem } from "@/lib/hubs/queries";
import { track } from "@/lib/analytics/track";
import { useMountEffect } from "@/lib/use-mount-effect";

const DEBOUNCE_MS = 150;
const RESULT_LIMIT = 5;

type SearchStatus = "idle" | "loading" | "ready" | "error";

function normalizeSearchInput(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeQuery(query: string) {
  return query.toLowerCase().replaceAll(" ", "").replaceAll("@", "");
}

function filterHubs(hubs: HubListItem[], query: string): HubListItem[] {
  const q = normalizeQuery(query);
  if (q.length < 2) return [];
  return hubs
    .filter((hub) => {
      const name = normalizeQuery(hub.name);
      const description = normalizeQuery(hub.description ?? "");
      const homepage = normalizeQuery(hub.homepage);
      return name.includes(q) || description.includes(q) || homepage.includes(q);
    })
    .slice(0, RESULT_LIMIT);
}

function readUrlQuery(): string {
  return new URLSearchParams(window.location.search).get("q") ?? "";
}

export function SearchCommand() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hubs, setHubs] = useState<HubListItem[]>([]);
  const [results, setResults] = useState<HubListItem[]>([]);
  const [status, setStatus] = useState<SearchStatus>("idle");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hubsLoadedRef = useRef(false);
  const openRef = useRef(open);
  openRef.current = open;

  const normalizedQuery = normalizeSearchInput(query);
  const viewAllHref = normalizedQuery ? `/hubs?q=${encodeURIComponent(normalizedQuery)}` : null;

  const resetSearch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setQuery("");
    setResults([]);
    setStatus("idle");
  }, []);

  const ensureHubs = useCallback(async () => {
    if (hubsLoadedRef.current) return hubs;
    setStatus("loading");
    try {
      const response = await fetch("/api/hubs/list");
      if (!response.ok) throw new Error(await parseApiError(response));
      const data = (await response.json()) as { hubs: HubListItem[] };
      hubsLoadedRef.current = true;
      setHubs(data.hubs);
      return data.hubs;
    } catch (error) {
      console.error(error);
      setStatus("error");
      return [] as HubListItem[];
    }
  }, [hubs]);

  const runSearch = useCallback(
    async (value: string) => {
      const normalized = normalizeSearchInput(value);
      if (normalized.length < 2) {
        setResults([]);
        setStatus("idle");
        return;
      }
      const catalog = await ensureHubs();
      setResults(filterHubs(catalog, normalized));
      setStatus("ready");
    },
    [ensureHubs],
  );

  const onQueryChange = useCallback(
    (value: string) => {
      setQuery(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void runSearch(value);
      }, DEBOUNCE_MS);
    },
    [runSearch],
  );

  const selectHref = useCallback(
    (href: string, meta?: { publicId?: string; source: "palette" | "view_all" }) => {
      if (meta) {
        track("search_result_selected", {
          public_id: meta.publicId,
          source: meta.source,
        });
      }
      setOpen(false);
      resetSearch();
      router.push(href);
    },
    [resetSearch, router],
  );

  const openPalette = useCallback(() => {
    const seed = readUrlQuery();
    setQuery(seed);
    setResults([]);
    setStatus("idle");
    setOpen(true);
    if (normalizeSearchInput(seed).length >= 2) void runSearch(seed);
  }, [runSearch]);

  useMountEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (openRef.current) {
          setOpen(false);
          resetSearch();
        } else {
          openPalette();
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  });

  function onOpenChange(nextOpen: boolean) {
    if (nextOpen) return;
    setOpen(false);
    resetSearch();
  }

  function emptyMessage(): ReactNode {
    if (normalizedQuery.length < 2) return "Type at least 2 characters to search.";
    if (status === "loading") {
      return (
        <span className="inline-flex items-center gap-2">
          <SpiralLoader className="size-4" />
          Searching…
        </span>
      );
    }
    if (status === "error") return "Search is temporarily unavailable.";
    return "No results.";
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="default"
        className="border border-input text-muted-foreground sm:hidden"
        aria-label="Search hubs"
        onClick={openPalette}
      >
        Search
        <Search data-icon="inline-end" />
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="default"
        className="hidden min-w-56 justify-start border border-input text-muted-foreground has-data-[slot=kbd-group]:pr-1.25 sm:inline-flex"
        aria-label="Search hubs"
        onClick={openPalette}
      >
        <Search data-icon="inline-start" />
        Search hubs
        <KbdGroup className="ml-auto bg-foreground/8">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Search hubs"
        description="Find hubs in the directory."
        className="sm:max-w-lg rounded-2xl!"
        showCloseButton={false}
      >
        <Command shouldFilter={false}>
          <CommandInput value={query} onValueChange={onQueryChange} placeholder="Search hubs…" />
          <CommandList>
            <CommandEmpty>{emptyMessage()}</CommandEmpty>
            {results.length > 0 ? (
              <CommandGroup heading="Hubs">
                {results.map((result) => (
                  <CommandItem
                    key={result.publicId}
                    value={`${result.name} ${result.publicId}`}
                    onSelect={() =>
                      selectHref(`/hubs?q=${encodeURIComponent(result.name)}`, {
                        publicId: result.publicId,
                        source: "palette",
                      })
                    }
                    className="gap-3 py-2"
                  >
                    {result.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={result.logoUrl}
                        alt=""
                        className="size-10 shrink-0 rounded-sm object-cover"
                      />
                    ) : (
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-muted text-xs font-medium">
                        {result.name.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{result.name}</p>
                      {result.description ? (
                        <p className="truncate text-xs text-muted-foreground">
                          {result.description}
                        </p>
                      ) : null}
                    </div>
                  </CommandItem>
                ))}
                {viewAllHref && normalizedQuery ? (
                  <CommandItem
                    value={`view-all ${normalizedQuery}`}
                    onSelect={() => selectHref(viewAllHref, { source: "view_all" })}
                    className="text-muted-foreground"
                  >
                    View all results for “{normalizedQuery}”
                  </CommandItem>
                ) : null}
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
