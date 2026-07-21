"use client";

import { useForm } from "@tanstack/react-form";
import { ArrowLeft, Glasses } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmAlertDialog } from "@/components/padme/confirm-alert-dialog";
import { OptionalMark } from "@/components/submit/optional-mark";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { AdminDetailDto } from "@/lib/hubs/admin";
import { parseApiError } from "@/lib/hubs/api-error";
import { type SubmitHubFormValues, submitHubFormValuesSchema } from "@/lib/hubs/draft-schema";
import {
  deleteHubLogo,
  logoFromUrl,
  type LogoState,
  uploadHubLogo,
  validateLogoFile,
} from "@/lib/hubs/upload-client";
import { cn } from "@/lib/utils";

function valuesFromDetail(detail: AdminDetailDto): SubmitHubFormValues {
  return {
    name: detail.name,
    homepage: detail.homepage,
    contactEmail: detail.contactEmail,
    launchUrl: detail.launchUrl,
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
    case "archived":
      return "Archived";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function PadmeDetail({ initial }: { initial: AdminDetailDto }) {
  const router = useRouter();
  const [detail, setDetail] = useState(initial);
  const [logo, setLogo] = useState<LogoState>(() =>
    logoFromUrl(initial.logoUrl, initial.logoObjectKey),
  );
  const [reviewerNotes, setReviewerNotes] = useState(initial.reviewerNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const form = useForm({
    defaultValues: valuesFromDetail(initial),
    validators: {
      onSubmit: submitHubFormValuesSchema,
    },
  });

  async function putPatch(patch: Record<string, unknown>) {
    setSaving(true);
    try {
      const response = await fetch(`/api/padme/hubs/${detail.publicId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }
      const next = (await response.json()) as AdminDetailDto;
      setDetail(next);
      form.reset(valuesFromDetail(next));
      setLogo(logoFromUrl(next.logoUrl, next.logoObjectKey));
      setReviewerNotes(next.reviewerNotes ?? "");
      toast.success("Saved");
      return next;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function saveDetails() {
    const parsed = submitHubFormValuesSchema.safeParse(form.state.values);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Fix the form errors");
      return;
    }
    await putPatch({
      ...parsed.data,
      description: parsed.data.description.trim() ? parsed.data.description : null,
      reviewerNotes: reviewerNotes.trim() ? reviewerNotes : null,
    });
  }

  async function setStatus(status: "published" | "rejected" | "pending") {
    await putPatch({ status, reviewerNotes: reviewerNotes.trim() ? reviewerNotes : null });
  }

  async function onLogoSelected(file: File | null) {
    if (!file) return;
    const validationError = validateLogoFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    setLogo({ status: "uploading", progress: 0, fileName: file.name });
    try {
      const result = await uploadHubLogo({
        hubId: detail.publicId,
        file,
        apiBase: "/api/padme",
        onProgress: (progress) => setLogo((prev) => ({ ...prev, progress })),
      });
      setLogo({
        status: "ready",
        progress: 100,
        publicUrl: result.publicUrl,
        objectKey: result.objectKey,
        fileName: file.name,
      });
      toast.success("Logo updated");
    } catch (error) {
      setLogo({
        status: "error",
        progress: 0,
        error: error instanceof Error ? error.message : "Upload failed",
      });
      toast.error(error instanceof Error ? error.message : "Upload failed");
    }
  }

  async function onDelete() {
    setSaving(true);
    try {
      const response = await fetch(`/api/padme/hubs/${detail.publicId}`, { method: "DELETE" });
      if (!response.ok && response.status !== 204) {
        throw new Error(await parseApiError(response));
      }
      toast.success("Deleted");
      router.push("/padme");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    } finally {
      setSaving(false);
      setConfirmDelete(false);
    }
  }

  const sim = simulatorHref(detail.launchUrl);

  return (
    <main className="page-px mx-auto w-full max-w-3xl flex-1 space-y-8 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Link
            href="/padme"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2")}
          >
            <ArrowLeft data-icon="inline-start" />
            Queue
          </Link>
          <h1 className="font-bold text-3xl tracking-tight">{detail.name}</h1>
          <p className="text-sm text-muted-foreground">{statusLabel(detail.status)}</p>
        </div>
        {sim ? (
          <Link
            href={sim}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "outline" })}
          >
            <Glasses data-icon="inline-start" />
            Try
          </Link>
        ) : null}
      </div>

      <FieldGroup>
        <form.Field name="name">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Name</FieldLabel>
              <Input
                id={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
              />
            </Field>
          )}
        </form.Field>
        <form.Field name="homepage">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Homepage</FieldLabel>
              <Input
                id={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
              />
            </Field>
          )}
        </form.Field>
        <form.Field name="launchUrl">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Launch URL</FieldLabel>
              <Input
                id={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
              />
            </Field>
          )}
        </form.Field>
        <form.Field name="contactEmail">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Contact email</FieldLabel>
              <Input
                id={field.name}
                type="email"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
              />
            </Field>
          )}
        </form.Field>
        <form.Field name="description">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>
                Description
                <OptionalMark />
              </FieldLabel>
              <Textarea
                id={field.name}
                rows={4}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
              />
            </Field>
          )}
        </form.Field>

        <Field>
          <FieldLabel>Logo</FieldLabel>
          <div className="flex flex-wrap items-center gap-3">
            {logo.publicUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logo.publicUrl}
                alt=""
                className="size-16 rounded-md border border-border object-cover"
              />
            ) : null}
            <label
              className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "cursor-pointer")}
            >
              {logo.status === "uploading" ? `Uploading ${logo.progress}%` : "Replace logo"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  event.target.value = "";
                  void onLogoSelected(file);
                }}
              />
            </label>
            {logo.status === "ready" ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  void deleteHubLogo(detail.publicId, "/api/padme")
                    .then(() => setLogo({ status: "idle", progress: 0 }))
                    .catch((error: unknown) => {
                      toast.error(error instanceof Error ? error.message : "Could not remove logo");
                    });
                }}
              >
                Remove
              </Button>
            ) : null}
          </div>
          {logo.error ? <FieldError>{logo.error}</FieldError> : null}
        </Field>

        <Field>
          <FieldLabel htmlFor="reviewer-notes">Reviewer notes</FieldLabel>
          <Textarea
            id="reviewer-notes"
            rows={3}
            value={reviewerNotes}
            onChange={(event) => setReviewerNotes(event.target.value)}
          />
        </Field>
      </FieldGroup>

      <div className="flex flex-wrap gap-2 border-t border-border pt-6">
        <Button type="button" disabled={saving} onClick={() => void saveDetails()}>
          Save details
        </Button>
        <Button
          type="button"
          variant="brand"
          disabled={saving || detail.status === "published"}
          onClick={() => void setStatus("published")}
        >
          Approve
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={saving || detail.status === "rejected"}
          onClick={() => void setStatus("rejected")}
        >
          Reject
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={saving || detail.status === "pending"}
          onClick={() => void setStatus("pending")}
        >
          Send to pending
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={saving}
          onClick={() => setConfirmDelete(true)}
        >
          Delete
        </Button>
      </div>

      <ConfirmAlertDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this hub?"
        description="This permanently deletes the hub and its logo. This cannot be undone."
        actionLabel="Delete"
        actionVariant="destructive"
        busy={saving}
        onConfirm={() => void onDelete()}
      />
    </main>
  );
}
