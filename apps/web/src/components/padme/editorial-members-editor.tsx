"use client";

import { ArrowDown, ArrowUp, Search, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import { ListingIcon } from "@/components/listings/listing-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { parseApiError } from "@/lib/apps/api-error";
import { normalizeSearchInput } from "@/lib/apps/search";
import type { AdminCollectionDetail, AdminCollectionMember } from "@/lib/collections/admin";
import { moveItem } from "@/lib/utils";

type SearchHit = {
  id: string;
  publicId: string;
  name: string;
  author: string;
  listingType: "app" | "game";
  categoryName: string;
  iconUrl: string | null;
};

const DEBOUNCE_MS = 150;

export function EditorialMembersEditor({
  collectionId,
  initialMembers,
  disabled,
  onSaved,
}: {
  collectionId: string;
  initialMembers: AdminCollectionMember[];
  disabled?: boolean;
  onSaved: (detail: AdminCollectionDetail) => void;
}) {
  const [members, setMembers] = useState(initialMembers);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const memberIds = new Set(members.map((member) => member.id));

  const runSearch = useCallback(async (value: string) => {
    abortRef.current?.abort();
    const normalized = normalizeSearchInput(value);
    if (!normalized) {
      setHits([]);
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setSearching(true);
    try {
      const response = await fetch(
        `/api/padme/apps/search?q=${encodeURIComponent(normalized)}&limit=8`,
        { signal: controller.signal },
      );
      if (!response.ok) throw new Error(await parseApiError(response));
      const data = (await response.json()) as { results: SearchHit[] };
      if (controller.signal.aborted) return;
      setHits(data.results);
    } catch (error) {
      if (controller.signal.aborted) return;
      console.error(error);
      setHits([]);
    } finally {
      if (!controller.signal.aborted) setSearching(false);
    }
  }, []);

  function onQueryChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void runSearch(value);
    }, DEBOUNCE_MS);
  }

  function addMember(hit: SearchHit) {
    if (memberIds.has(hit.id)) return;
    setMembers((current) => [
      ...current,
      {
        id: hit.id,
        publicId: hit.publicId,
        name: hit.name,
        listingType: hit.listingType,
        categoryName: hit.categoryName,
        iconUrl: hit.iconUrl,
        author: hit.author,
        status: "published",
      },
    ]);
    setQuery("");
    setHits([]);
  }

  function removeMember(id: string) {
    setMembers((current) => current.filter((member) => member.id !== id));
  }

  function moveMember(index: number, direction: -1 | 1) {
    setMembers((current) => moveItem(current, index, direction));
  }

  async function saveMembers() {
    setSaving(true);
    try {
      const response = await fetch(`/api/padme/collections/${collectionId}/members`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedAppIds: members.map((member) => member.id) }),
      });
      if (!response.ok) throw new Error(await parseApiError(response));
      const detail = (await response.json()) as AdminCollectionDetail;
      setMembers(detail.members);
      onSaved(detail);
      toast.success("Membership saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const busy = disabled || saving;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Members</h2>
          <p className="text-sm text-muted-foreground">
            Published apps only. Save explicitly after reordering.
          </p>
        </div>
        <Button type="button" size="sm" disabled={busy} onClick={() => void saveMembers()}>
          {saving ? "Saving…" : "Save membership"}
        </Button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search published apps…"
          className="pl-8"
          disabled={busy}
        />
        {searching ? <p className="mt-1 text-xs text-muted-foreground">Searching…</p> : null}
        {hits.length > 0 ? (
          <ItemGroup className="absolute z-10 mt-1 max-h-64 w-full gap-0 overflow-auto rounded-lg border border-border bg-popover p-1 shadow-md">
            {hits.map((hit) => {
              const already = memberIds.has(hit.id);
              return (
                <Item
                  key={hit.id}
                  size="sm"
                  className="rounded-md disabled:opacity-50"
                  render={
                    <button
                      type="button"
                      disabled={already || busy}
                      onClick={() => addMember(hit)}
                    />
                  }
                >
                  <ItemMedia variant="image">
                    <ListingIcon src={hit.iconUrl} alt="" size={32} />
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>{hit.name}</ItemTitle>
                    <ItemDescription>
                      {hit.author} · {hit.listingType === "game" ? "Game" : "App"} ·{" "}
                      {hit.categoryName}
                      {already ? " · already added" : ""}
                    </ItemDescription>
                  </ItemContent>
                </Item>
              );
            })}
          </ItemGroup>
        ) : null}
      </div>

      {members.length === 0 ? (
        <p className="text-sm text-muted-foreground">No members yet.</p>
      ) : (
        <ItemGroup>
          {members.map((member, index) => (
            <Item key={member.id} variant="outline" size="sm">
              <ItemMedia variant="image">
                <ListingIcon src={member.iconUrl} alt="" size={32} />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>{member.name}</ItemTitle>
                <ItemDescription>
                  {member.listingType === "game" ? "Game" : "App"} · {member.categoryName} ·{" "}
                  {member.status}
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="Move up"
                  disabled={busy || index === 0}
                  onClick={() => moveMember(index, -1)}
                >
                  <ArrowUp />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="Move down"
                  disabled={busy || index === members.length - 1}
                  onClick={() => moveMember(index, 1)}
                >
                  <ArrowDown />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="Remove"
                  disabled={busy}
                  onClick={() => removeMember(member.id)}
                >
                  <X />
                </Button>
              </ItemActions>
            </Item>
          ))}
        </ItemGroup>
      )}
    </section>
  );
}
