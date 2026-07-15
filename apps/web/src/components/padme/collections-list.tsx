"use client";

import { ArrowDown, ArrowUp, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmAlertDialog } from "@/components/padme/confirm-alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item";
import { parseApiError } from "@/lib/apps/api-error";
import type { AdminCollectionListItem } from "@/lib/collections/admin";
import { cn, moveItem } from "@/lib/utils";

const updatedAtFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

function formatWhen(iso: string): string {
  try {
    return `${updatedAtFormatter.format(new Date(iso))} UTC`;
  } catch {
    return iso;
  }
}

type PendingConfirm =
  | { kind: "unpublish"; id: string; name: string }
  | { kind: "delete"; id: string; name: string };

export function CollectionsList({ initial }: { initial: AdminCollectionListItem[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const items = initial;

  async function reorder(next: AdminCollectionListItem[]) {
    setBusyId("reorder");
    try {
      const response = await fetch("/api/padme/collections/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: next.map((item) => item.id) }),
      });
      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Reorder failed");
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  function move(index: number, direction: -1 | 1) {
    void reorder(moveItem(items, index, direction));
  }

  async function setStatus(id: string, status: "draft" | "published") {
    const label = status === "published" ? "Publish" : "Unpublish";
    setBusyId(id);
    try {
      const response = await fetch(`/api/padme/collections/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }
      toast.success(status === "published" ? "Published" : "Unpublished");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `${label} failed`);
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    setBusyId(id);
    try {
      const response = await fetch(`/api/padme/collections/${id}`, { method: "DELETE" });
      if (!response.ok && response.status !== 204) {
        throw new Error(await parseApiError(response));
      }
      toast.success("Deleted");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    } finally {
      setBusyId(null);
    }
  }

  function runPendingConfirm() {
    if (!pending) return;
    switch (pending.kind) {
      case "unpublish":
        void setStatus(pending.id, "draft");
        break;
      case "delete":
        void remove(pending.id);
        break;
      default: {
        const _exhaustive: never = pending;
        return _exhaustive;
      }
    }
  }

  return (
    <main className="page-px mx-auto w-full max-w-3xl flex-1 py-10 min-h-[calc(100svh-12rem)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-bold text-3xl tracking-tight">Collections</h1>
        <Link
          href="/padme/collections/new"
          className={buttonVariants({ variant: "default", size: "sm" })}
        >
          <Plus data-icon="inline-start" />
          New collection
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="mt-10 text-muted-foreground">No collections yet.</p>
      ) : (
        <ItemGroup className="mt-8 gap-0">
          {items.flatMap((item, index) => {
            const busy = busyId === item.id || busyId === "reorder";
            return [
              <Item key={item.id} variant="default">
                <ItemContent className="min-w-0">
                  <Link
                    href={`/padme/collections/${item.id}`}
                    className="-my-2.5 -ml-3 flex min-w-0 flex-col gap-1 rounded-lg py-2.5 pr-2 pl-3 outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <div className="flex max-w-full flex-wrap items-center gap-2">
                      <ItemTitle className="min-w-0">{item.name}</ItemTitle>
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">
                        {item.kind}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs capitalize",
                          item.status === "published"
                            ? "bg-brand/10 text-brand"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {item.status}
                      </span>
                    </div>
                    <ItemDescription>
                      /apps/collections/{item.slug} · {item.itemCount}{" "}
                      {item.itemCount === 1 ? "item" : "items"} · Updated{" "}
                      {formatWhen(item.updatedAt)}
                    </ItemDescription>
                    {item.publishedButEmpty ? (
                      <ItemDescription className="text-destructive">
                        Published but empty — omitted from the public hub.
                      </ItemDescription>
                    ) : null}
                  </Link>
                </ItemContent>
                <ItemActions>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    aria-label="Move up"
                    disabled={busy || index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    aria-label="Move down"
                    disabled={busy || index === items.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <ArrowDown />
                  </Button>
                  <Link
                    href={`/padme/collections/${item.id}`}
                    className={buttonVariants({ variant: "secondary", size: "sm" })}
                  >
                    Edit
                  </Link>
                  {item.status === "published" ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        setPending({ kind: "unpublish", id: item.id, name: item.name })
                      }
                    >
                      Unpublish
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      disabled={busy}
                      onClick={() => void setStatus(item.id, "published")}
                    >
                      Publish
                    </Button>
                  )}
                  {item.status === "draft" ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => setPending({ kind: "delete", id: item.id, name: item.name })}
                    >
                      Delete
                    </Button>
                  ) : null}
                </ItemActions>
              </Item>,
              ...(index < items.length - 1
                ? [<ItemSeparator key={`${item.id}-sep`} className="my-0" />]
                : []),
            ];
          })}
        </ItemGroup>
      )}

      <ConfirmAlertDialog
        open={pending?.kind === "unpublish"}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
        title="Unpublish collection?"
        description={
          pending?.kind === "unpublish"
            ? `“${pending.name}” will leave the public hub until you publish it again.`
            : ""
        }
        actionLabel="Unpublish"
        busy={busyId != null}
        onConfirm={runPendingConfirm}
      />
      <ConfirmAlertDialog
        open={pending?.kind === "delete"}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
        title="Delete draft?"
        description={
          pending?.kind === "delete" ? `Delete draft “${pending.name}”? This cannot be undone.` : ""
        }
        actionLabel="Delete"
        actionVariant="destructive"
        busy={busyId != null}
        onConfirm={runPendingConfirm}
      />
    </main>
  );
}
