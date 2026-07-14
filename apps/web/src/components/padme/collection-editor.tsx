"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmAlertDialog } from "@/components/padme/confirm-alert-dialog";
import { EditorialMembersEditor } from "@/components/padme/editorial-members-editor";
import {
  SmartCollectionFields,
  type SmartCollectionValues,
} from "@/components/padme/smart-collection-fields";
import { ListingsGrid } from "@/components/listings/listings-grid";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { parseApiError } from "@/lib/apps/api-error";
import type { AdminCollectionDetail } from "@/lib/collections/admin";
import type { CategoryDefinition } from "@/lib/category/categories";

function statusLabel(status: AdminCollectionDetail["status"]): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "published":
      return "Published";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

type PendingConfirm = "unpublish" | "delete" | "slug" | null;

export function CollectionEditor({
  initial,
  categories,
}: {
  initial: AdminCollectionDetail;
  categories: readonly CategoryDefinition[];
}) {
  const router = useRouter();
  const [detail, setDetail] = useState(initial);
  const [name, setName] = useState(initial.name);
  const [slug, setSlug] = useState(initial.slug);
  const [description, setDescription] = useState(initial.description ?? "");
  const [smart, setSmart] = useState<SmartCollectionValues>({
    filterListingType: initial.filterListingType,
    filterCategorySlug: initial.filterCategorySlug,
    smartSort: initial.smartSort ?? "new",
    itemLimit: initial.itemLimit ?? 6,
  });
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<PendingConfirm>(null);

  async function patch(body: Record<string, unknown>, successMessage?: string) {
    setSaving(true);
    try {
      const response = await fetch(`/api/padme/collections/${detail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(await parseApiError(response));
      const next = (await response.json()) as AdminCollectionDetail;
      setDetail(next);
      setName(next.name);
      setSlug(next.slug);
      setDescription(next.description ?? "");
      setSmart({
        filterListingType: next.filterListingType,
        filterCategorySlug: next.filterCategorySlug,
        smartSort: next.smartSort ?? "new",
        itemLimit: next.itemLimit ?? 6,
      });
      if (successMessage) toast.success(successMessage);
      router.refresh();
      return next;
    } finally {
      setSaving(false);
    }
  }

  async function persistMetadata() {
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || null,
      };
      if (detail.kind === "smart") {
        body.filterListingType = smart.filterListingType;
        body.filterCategorySlug = smart.filterCategorySlug;
        body.smartSort = smart.smartSort;
        body.itemLimit = smart.itemLimit;
      }
      await patch(body, "Saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    }
  }

  function saveMetadata() {
    if (detail.status === "published" && slug !== detail.slug) {
      setPending("slug");
      return;
    }
    void persistMetadata();
  }

  async function setStatus(status: "draft" | "published") {
    try {
      await patch({ status }, status === "published" ? "Published" : "Unpublished");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    }
  }

  async function remove() {
    setSaving(true);
    try {
      const response = await fetch(`/api/padme/collections/${detail.id}`, { method: "DELETE" });
      if (!response.ok && response.status !== 204) {
        throw new Error(await parseApiError(response));
      }
      toast.success("Deleted");
      router.push("/padme/collections");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
      setSaving(false);
    }
  }

  return (
    <main className="page-px mx-auto w-full max-w-3xl flex-1 space-y-10 py-10 min-h-[calc(100svh-12rem)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/padme/collections"
          className={buttonVariants({ variant: "secondary", size: "sm" })}
        >
          <ArrowLeft data-icon="inline-start" />
          Collections
        </Link>
        <div className="flex flex-wrap gap-2">
          {detail.status === "published" ? (
            <Link
              href={`/apps/collections/${detail.slug}`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              View public page
            </Link>
          ) : null}
          {detail.status === "published" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={saving}
              onClick={() => setPending("unpublish")}
            >
              Unpublish
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              disabled={saving}
              onClick={() => void setStatus("published")}
            >
              Publish
            </Button>
          )}
          {detail.status === "draft" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={saving}
              onClick={() => setPending("delete")}
            >
              Delete
            </Button>
          ) : null}
        </div>
      </div>

      <div>
        <h1 className="font-bold text-3xl tracking-tight">{detail.name}</h1>
        <p className="mt-2 text-muted-foreground">
          {statusLabel(detail.status)} · {detail.kind}
          {detail.publishedButEmpty ? " · warning: published but empty" : ""}
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Details</h2>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="edit-name">Name</FieldLabel>
            <Input
              id="edit-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              disabled={saving}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="edit-slug">Slug</FieldLabel>
            <Input
              id="edit-slug"
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              maxLength={80}
              disabled={saving}
            />
            <p className="text-xs text-muted-foreground">
              Public URL: /apps/collections/{slug || "…"}
            </p>
          </Field>
          <Field>
            <FieldLabel htmlFor="edit-description">Description</FieldLabel>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={300}
              rows={3}
              disabled={saving}
            />
          </Field>
        </FieldGroup>

        {detail.kind === "smart" ? (
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Smart filters</h3>
            <SmartCollectionFields
              values={smart}
              categories={categories}
              disabled={saving}
              onChange={(next) => setSmart((current) => ({ ...current, ...next }))}
            />
          </div>
        ) : null}

        <Button type="button" disabled={saving} onClick={saveMetadata}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </section>

      {detail.kind === "editorial" ? (
        <EditorialMembersEditor
          collectionId={detail.id}
          initialMembers={detail.members}
          disabled={saving}
          onSaved={(next) => {
            setDetail(next);
            router.refresh();
          }}
        />
      ) : null}

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Preview</h2>
          <p className="text-sm text-muted-foreground">
            Resolved public shelf ({detail.previewCount}{" "}
            {detail.previewCount === 1 ? "item" : "items"}
            {detail.kind === "smart" ? `, hub limit ${detail.itemLimit ?? "—"}` : ""}).
          </p>
        </div>
        {detail.publishedButEmpty ? (
          <p className="text-sm text-destructive">
            This collection is published but currently resolves no apps, so the hub omits it.
          </p>
        ) : null}
        {detail.preview.length === 0 ? (
          <p className="text-sm text-muted-foreground">No resolved listings.</p>
        ) : (
          <ListingsGrid listings={detail.preview} />
        )}
      </section>

      <ConfirmAlertDialog
        open={pending === "unpublish"}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
        title="Unpublish collection?"
        description="It will leave the public hub until you publish it again."
        actionLabel="Unpublish"
        busy={saving}
        onConfirm={() => void setStatus("draft")}
      />
      <ConfirmAlertDialog
        open={pending === "delete"}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
        title="Delete draft?"
        description={`Delete draft “${detail.name}”? This cannot be undone.`}
        actionLabel="Delete"
        actionVariant="destructive"
        busy={saving}
        onConfirm={() => void remove()}
      />
      <ConfirmAlertDialog
        open={pending === "slug"}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
        title="Change public slug?"
        description={`Change the public slug from “${detail.slug}” to “${slug}”? Existing links to /apps/collections/${detail.slug} will 404.`}
        actionLabel="Change slug"
        busy={saving}
        onConfirm={() => void persistMetadata()}
      />
    </main>
  );
}
