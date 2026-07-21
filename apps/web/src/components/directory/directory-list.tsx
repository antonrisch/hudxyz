"use client";

import { ArrowUpRight, Search, X } from "lucide-react";
import Link from "next/link";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import { useDeferredValue } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item";
import type { HubListItem } from "@/lib/hubs/queries";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

function normalizeQuery(query: string) {
  return query.toLowerCase().replaceAll(" ", "").replaceAll("@", "");
}

function filterHubs(hubs: HubListItem[], query: string) {
  if (!query) return hubs;
  const q = normalizeQuery(query);
  return hubs.filter((hub) => {
    const name = normalizeQuery(hub.name);
    const description = normalizeQuery(hub.description ?? "");
    const homepage = normalizeQuery(hub.homepage);
    return name.includes(q) || description.includes(q) || homepage.includes(q);
  });
}

function getHomepageUrl(homepage: string) {
  try {
    const url = new URL(homepage);
    url.searchParams.set("utm_source", "hudxyz.com");
    url.searchParams.set("utm_medium", "referral");
    url.searchParams.set("utm_campaign", "directory");
    return url.toString();
  } catch {
    return homepage;
  }
}

export function DirectoryList({ hubs }: { hubs: HubListItem[] }) {
  const [query, setQuery] = useQueryState("q", {
    ...parseAsString.withDefault(""),
    history: "replace",
  });
  const [page, setPage] = useQueryState("page", {
    ...parseAsInteger.withDefault(1),
    history: "push",
  });

  const deferredQuery = useDeferredValue(query);
  const filtered = filterHubs(hubs, deferredQuery);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="mt-8">
      <InputGroup className="h-10">
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
        <InputGroupInput
          placeholder="Search"
          value={query}
          onChange={(event) => {
            void setQuery(event.target.value || null);
            void setPage(null);
          }}
          aria-label="Search hubs"
        />
        <InputGroupAddon align="inline-end" className="pr-3">
          <InputGroupText className="text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "hub" : "hubs"}
          </InputGroupText>
          {query ? (
            <InputGroupButton
              size="icon-xs"
              aria-label="Clear search"
              onClick={() => {
                void setQuery(null);
                void setPage(null);
              }}
            >
              <X />
            </InputGroupButton>
          ) : null}
        </InputGroupAddon>
      </InputGroup>

      {pageItems.length === 0 ? (
        <p className="mt-10 text-muted-foreground">
          {deferredQuery
            ? "No hubs match your search."
            : "No hubs published yet. Submit one to get started."}
        </p>
      ) : (
        <ItemGroup className="mt-6 gap-0">
          {pageItems.map((hub, index) => (
            <div key={hub.id}>
              <Item variant="default" size="sm" className="px-0">
                <ItemMedia variant="image">
                  {hub.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={hub.logoUrl} alt="" className="size-full object-cover" />
                  ) : (
                    <span className="flex size-full items-center justify-center bg-muted text-xs font-medium text-muted-foreground">
                      {hub.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>
                    <a
                      href={getHomepageUrl(hub.homepage)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 hover:underline"
                    >
                      {hub.name}
                      <ArrowUpRight className="size-3.5 opacity-60" />
                    </a>
                  </ItemTitle>
                  {hub.description ? <ItemDescription>{hub.description}</ItemDescription> : null}
                </ItemContent>
                <ItemActions>
                  <Link
                    href={`/simulator?url=${encodeURIComponent(hub.launchUrl)}`}
                    className={cn(buttonVariants({ variant: "brand", size: "sm" }))}
                  >
                    Try
                  </Link>
                </ItemActions>
              </Item>
              {index < pageItems.length - 1 ? <ItemSeparator className="my-1" /> : null}
            </div>
          ))}
        </ItemGroup>
      )}

      {totalPages > 1 ? (
        <div className="mt-8 flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => void setPage(currentPage - 1 <= 1 ? null : currentPage - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => void setPage(currentPage + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}
