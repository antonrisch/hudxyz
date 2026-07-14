"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, type ReactNode } from "react";

import { SpiralLoader } from "@/components/icons/spiral-loader";
import { ListingIcon } from "@/components/listings/listing-icon";
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
import { parseApiError } from "@/lib/apps/api-error";
import { normalizeSearchInput } from "@/lib/apps/search";
import { useMountEffect } from "@/lib/use-mount-effect";

type SearchResult = {
  publicId: string;
  name: string;
  listingType: "app" | "game";
  categoryName: string;
  iconUrl: string | null;
  href: string;
};

const DEBOUNCE_MS = 150;
const RESULT_LIMIT = 5;

type SearchStatus = "idle" | "loading" | "ready" | "error";

/** Read `?q=` at open time — avoids nuqs/useSearchParams Suspense bailout on static pages. */
function readUrlQuery(): string {
  return new URLSearchParams(window.location.search).get("q") ?? "";
}

export function SearchCommand() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [status, setStatus] = useState<SearchStatus>("idle");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Ref mirrors latest open so the mount-time ⌘K listener stays valid.
  const openRef = useRef(open);
  openRef.current = open;

  const normalizedQuery = normalizeSearchInput(query);
  const viewAllHref = normalizedQuery ? `/apps?q=${encodeURIComponent(normalizedQuery)}` : null;

  const resetSearch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();
    abortRef.current = null;
    setQuery("");
    setResults([]);
    setStatus("idle");
  }, []);

  const runSearch = useCallback(async (value: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const normalized = normalizeSearchInput(value);
    if (!normalized) {
      setResults([]);
      setStatus("idle");
      return;
    }

    setStatus("loading");
    try {
      const response = await fetch(
        `/api/apps/search?q=${encodeURIComponent(normalized)}&limit=${RESULT_LIMIT}`,
        { signal: controller.signal },
      );
      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }
      const data = (await response.json()) as { results: SearchResult[] };
      if (controller.signal.aborted) return;
      setResults(data.results);
      setStatus("ready");
    } catch (error) {
      if (controller.signal.aborted) return;
      console.error(error);
      setResults([]);
      setStatus("error");
    }
  }, []);

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
    (href: string) => {
      setOpen(false);
      resetSearch();
      router.push(href);
    },
    [resetSearch, router],
  );

  // Open the palette, seeding it from the active `?q=` so it reflects the current search.
  const openPalette = useCallback(() => {
    const seed = readUrlQuery();
    setQuery(seed);
    setResults([]);
    setStatus("idle");
    setOpen(true);
    if (normalizeSearchInput(seed)) void runSearch(seed);
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
      abortRef.current?.abort();
    };
  });

  function onOpenChange(nextOpen: boolean) {
    if (nextOpen) return;
    setOpen(false);
    resetSearch();
  }

  function emptyMessage(): ReactNode {
    if (!normalizedQuery) return "Type at least 2 characters to search.";
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
        size="icon"
        className="sm:hidden"
        aria-label="Search apps"
        onClick={openPalette}
      >
        <Search />
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="default"
        className="hidden min-w-56 justify-start border border-input text-muted-foreground has-data-[slot=kbd-group]:pr-1.25 sm:inline-flex"
        aria-label="Search apps"
        onClick={openPalette}
      >
        <Search data-icon="inline-start" />
        Search apps
        <KbdGroup className="ml-auto bg-foreground/8">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Search apps"
        description="Find apps and games in the directory."
        className="sm:max-w-lg"
        showCloseButton={false}
      >
        <Command shouldFilter={false} className="rounded-xl!">
          <CommandInput
            value={query}
            onValueChange={onQueryChange}
            placeholder="Search apps and games…"
          />
          <CommandList>
            <CommandEmpty>{emptyMessage()}</CommandEmpty>
            {results.length > 0 ? (
              <CommandGroup heading="Apps">
                {results.map((result) => (
                  <CommandItem
                    key={result.publicId}
                    value={`${result.name} ${result.publicId}`}
                    onSelect={() => selectHref(result.href)}
                    className="gap-3 py-2"
                  >
                    <ListingIcon src={result.iconUrl} alt="" size={40} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{result.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {result.listingType === "game" ? "Game" : "App"} · {result.categoryName}
                      </p>
                    </div>
                  </CommandItem>
                ))}
                {viewAllHref && normalizedQuery ? (
                  <CommandItem
                    value={`view-all ${normalizedQuery}`}
                    onSelect={() => selectHref(viewAllHref)}
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
