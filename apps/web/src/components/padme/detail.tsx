"use client";

import { useForm } from "@tanstack/react-form";
import { ArrowLeft, Glasses } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import {
  SubmitDetailsFields,
  type SubmitCategoryOption,
  type SubmitFormApi,
} from "@/components/submit/submit-details-fields";
import { SubmitIconField, SubmitMedia } from "@/components/submit/submit-media";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import type { AdminDetailDto } from "@/lib/apps/admin";
import { parseApiError } from "@/lib/apps/api-error";
import { type SubmitFormValues, submitFormValuesSchema } from "@/lib/apps/draft-schema";
import { listingPath } from "@/lib/apps/public-id";
import { mediaFromAssets, type MediaState } from "@/lib/apps/upload-client";

function valuesFromDetail(detail: AdminDetailDto): SubmitFormValues {
  return {
    name: detail.name,
    author: detail.author,
    contactEmail: detail.contactEmail,
    launchUrl: detail.launchUrl,
    listingType: detail.listingType,
    primaryCategoryId: detail.primaryCategoryId,
    secondaryCategoryId: detail.secondaryCategoryId ?? "",
    description: detail.description ?? "",
  };
}

function simulatorHref(launchUrl: string): string | null {
  try {
    const url = new URL(launchUrl);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return `/simulator?url=${encodeURIComponent(launchUrl)}`;
    }
  } catch {
    return null;
  }
  return null;
}

function statusLabel(status: AdminDetailDto["status"]): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "pending":
      return "Pending review";
    case "published":
      return "Published";
    case "rejected":
      return "Rejected";
    default:
      return status;
  }
}

export function PadmeDetail({
  initial,
  categories,
}: {
  initial: AdminDetailDto;
  categories: readonly SubmitCategoryOption[];
}) {
  const router = useRouter();
  const [detail, setDetail] = useState(initial);
  const [media, setMedia] = useState<MediaState>(() => mediaFromAssets(initial.assets));
  const [reviewerNotes, setReviewerNotes] = useState(initial.reviewerNotes ?? "");
  const [saving, setSaving] = useState(false);

  const form = useForm({
    defaultValues: valuesFromDetail(initial),
    validators: {
      onSubmit: submitFormValuesSchema,
    },
  }) as SubmitFormApi;

  async function putPatch(patch: Record<string, unknown>) {
    setSaving(true);
    try {
      const response = await fetch(`/api/padme/apps/${detail.publicId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }
      const next = (await response.json()) as AdminDetailDto;
      setDetail(next);
      setReviewerNotes(next.reviewerNotes ?? "");
      form.reset(valuesFromDetail(next));
      router.refresh();
      return next;
    } finally {
      setSaving(false);
    }
  }

  async function saveFields() {
    const parsed = submitFormValuesSchema.safeParse(form.state.values);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Validation failed");
      return;
    }
    try {
      await putPatch({
        ...parsed.data,
        description: parsed.data.description.trim() || null,
        secondaryCategoryId: parsed.data.secondaryCategoryId.trim() || null,
        reviewerNotes: reviewerNotes.trim() || null,
      });
      toast.success("Saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    }
  }

  async function setStatus(status: "published" | "rejected" | "pending") {
    try {
      await putPatch({
        status,
        reviewerNotes: reviewerNotes.trim() || null,
      });
      toast.success(
        status === "published"
          ? "Published"
          : status === "rejected"
            ? "Rejected"
            : detail.status === "draft"
              ? "Sent to pending"
              : "Sent back to pending",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    }
  }

  const sim = simulatorHref(detail.launchUrl);
  const listingHref =
    detail.status === "published" ? listingPath(detail.slug, detail.publicId) : null;

  return (
    <main className="page-px mx-auto w-full max-w-3xl flex-1 py-10 min-h-[calc(100svh-12rem)]">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <Link href="/padme" className={buttonVariants({ variant: "secondary", size: "sm" })}>
          <ArrowLeft data-icon="inline-start" />
          Queue
        </Link>
        <div className="flex flex-wrap gap-2">
          {sim ? (
            <Link
              href={sim}
              target="_blank"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Glasses data-icon="inline-start" />
              Preview in simulator
            </Link>
          ) : null}
          {listingHref ? (
            <Link
              href={listingHref}
              className={buttonVariants({ variant: "secondary", size: "sm" })}
            >
              View in directory
            </Link>
          ) : null}
        </div>
      </div>

      <h1 className="font-bold text-3xl tracking-tight">{detail.name}</h1>
      <p className="mt-2 text-muted-foreground">{statusLabel(detail.status)}</p>

      <div className="mt-8 space-y-10">
        <SubmitIconField
          media={media}
          onChange={setMedia}
          ensureAppId={async () => detail.publicId}
          disabled={saving}
          apiBase="/api/padme"
        />

        <form.Subscribe selector={(state) => state.values.listingType}>
          {(listingType) => (
            <SubmitDetailsFields
              form={form}
              categories={categories}
              listingType={listingType}
              initialSecondaryCategoryId={detail.secondaryCategoryId}
              defaultCatalogOpen
            />
          )}
        </form.Subscribe>

        <SubmitMedia
          media={media}
          onChange={setMedia}
          ensureAppId={async () => detail.publicId}
          disabled={saving}
          apiBase="/api/padme"
        />

        <section className="space-y-4">
          <h2 className="font-semibold text-xl tracking-tight">Review</h2>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="reviewerNotes">Notes</FieldLabel>
              <Textarea
                id="reviewerNotes"
                value={reviewerNotes}
                onChange={(event) => setReviewerNotes(event.target.value)}
                rows={3}
                disabled={saving}
              />
            </Field>
          </FieldGroup>
          <div className="flex flex-wrap gap-2">
            {detail.status === "draft" ? (
              <Button
                type="button"
                variant="secondary"
                disabled={saving}
                onClick={() => void setStatus("pending")}
              >
                Send to pending
              </Button>
            ) : (
              <>
                {detail.status !== "published" ? (
                  <Button
                    type="button"
                    disabled={saving}
                    onClick={() => void setStatus("published")}
                  >
                    Approve
                  </Button>
                ) : null}
                {detail.status !== "rejected" ? (
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={saving}
                    onClick={() => void setStatus("rejected")}
                  >
                    Reject
                  </Button>
                ) : null}
                {detail.status !== "pending" ? (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={saving}
                    onClick={() => void setStatus("pending")}
                  >
                    Send to pending
                  </Button>
                ) : null}
              </>
            )}
            <Button
              type="button"
              variant="brand"
              disabled={saving}
              onClick={() => void saveFields()}
            >
              Save details
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
