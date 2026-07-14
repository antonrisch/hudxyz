"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { parseApiError } from "@/lib/apps/api-error";
import { SLUG_PATTERN, slugifyName } from "@/lib/apps/draft-schema";
import type { AdminCollectionDetail } from "@/lib/collections/admin";
import type { CollectionKind } from "@/db/schema";

export function CollectionCreate() {
  const router = useRouter();
  const [kind, setKind] = useState<CollectionKind>("editorial");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  function onNameChange(value: string) {
    setName(value);
    if (!slugTouched) {
      setSlug(slugifyName(value).slice(0, 80));
    }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!SLUG_PATTERN.test(slug)) {
      toast.error("Slug must be lowercase URL-safe (a-z, 0-9, hyphens).");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/padme/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, name: name.trim(), slug: slug.trim() }),
      });
      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }
      const created = (await response.json()) as AdminCollectionDetail;
      toast.success("Draft created");
      router.push(`/padme/collections/${created.id}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="page-px mx-auto w-full max-w-3xl flex-1 py-10 min-h-[calc(100svh-12rem)]">
      <Link href="/padme/collections" className={buttonVariants({ variant: "secondary" })}>
        <ArrowLeft data-icon="inline-start" />
        Collections
      </Link>

      <h1 className="mt-6 font-bold text-3xl tracking-tight">New collection</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Kind is fixed after creation. Create a replacement to switch between editorial and smart.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-6">
        <FieldGroup>
          <Field>
            <FieldLabel>Kind</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { value: "editorial", label: "Editorial" },
                  { value: "smart", label: "Smart" },
                ] as const
              ).map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={kind === option.value ? "default" : "outline"}
                  size="sm"
                  disabled={saving}
                  onClick={() => setKind(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </Field>
          <Field>
            <FieldLabel htmlFor="collection-name">Name</FieldLabel>
            <Input
              id="collection-name"
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              maxLength={80}
              required
              disabled={saving}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="collection-slug">Slug</FieldLabel>
            <Input
              id="collection-slug"
              value={slug}
              onChange={(event) => {
                setSlugTouched(true);
                setSlug(event.target.value);
              }}
              maxLength={80}
              required
              disabled={saving}
            />
            <p className="text-xs text-muted-foreground">
              Public URL: /apps/collections/{slug || "…"}
            </p>
          </Field>
        </FieldGroup>
        <Button type="submit" disabled={saving || !name.trim() || !slug.trim()}>
          {saving ? "Creating…" : "Create draft"}
        </Button>
      </form>
    </main>
  );
}
