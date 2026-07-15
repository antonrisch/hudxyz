"use client";

import { useForm } from "@tanstack/react-form";
import { Glasses } from "lucide-react";
import Link from "next/link";
import { parseAsString, useQueryState } from "nuqs";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { SubmitConfirmation } from "@/components/submit/submit-confirmation";
import {
  SubmitDetailsFields,
  type SubmitCategoryOption,
  type SubmitFormApi,
} from "@/components/submit/submit-details-fields";
import { SubmitIconField, SubmitMedia } from "@/components/submit/submit-media";
import { Button, buttonVariants } from "@/components/ui/button";
import { parseApiError } from "@/lib/apps/api-error";
import {
  type DraftAppDto,
  type DraftDetailDto,
  DRAFT_STUB_CONTACT_EMAIL,
  isDraftStub,
} from "@/lib/apps/draft";
import { type SubmitFormValues, submitFormValuesSchema } from "@/lib/apps/draft-schema";
import {
  emptyMediaState,
  mediaFromAssets,
  type MediaItem,
  type MediaState,
} from "@/lib/apps/upload-client";
import { cn } from "@/lib/utils";

type AutofillMetadata = {
  name: string | null;
  description: string | null;
  author: string | null;
  iconUrl: string | null;
  mrbdCapable: boolean;
  warnings: string[];
};

const emptyValues: SubmitFormValues = {
  name: "",
  author: "",
  contactEmail: "",
  launchUrl: "",
  listingType: "app",
  primaryCategoryId: "",
  secondaryCategoryId: "",
  description: "",
};

function valuesFromDetail(detail: DraftDetailDto): SubmitFormValues {
  if (isDraftStub(detail)) {
    return {
      ...emptyValues,
      listingType: detail.listingType,
      // Keep stub primary category so autosave doesn't clear a valid FK until they pick one.
      primaryCategoryId: detail.primaryCategoryId,
    };
  }

  return {
    name: detail.name,
    author: detail.author,
    contactEmail: detail.contactEmail === DRAFT_STUB_CONTACT_EMAIL ? "" : detail.contactEmail,
    launchUrl: detail.launchUrl,
    listingType: detail.listingType,
    primaryCategoryId: detail.primaryCategoryId,
    secondaryCategoryId: detail.secondaryCategoryId ?? "",
    description: detail.description ?? "",
  };
}

function simulatorHrefFor(launchUrl: string): string | null {
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

function isEmptyName(value: string): boolean {
  const trimmed = value.trim();
  return !trimmed || trimmed === "Untitled";
}

function isEmptyAuthor(value: string): boolean {
  const trimmed = value.trim();
  return !trimmed || trimmed === "Unknown";
}

function isEmptyDescription(value: string): boolean {
  return !value.trim();
}

export function SubmitForm({
  categories,
  initialDetail,
  appsMediaEnabled,
}: {
  categories: readonly SubmitCategoryOption[];
  initialDetail: DraftDetailDto | null;
  appsMediaEnabled: boolean;
}) {
  // `?id=` is the public id (10-char Crockford), not the internal uuid.
  const [publicId, setPublicId] = useQueryState("id", parseAsString);
  const publicIdRef = useRef<string | null>(publicId ?? initialDetail?.publicId ?? null);
  const ensurePromiseRef = useRef<Promise<string> | null>(null);

  const [media, setMedia] = useState<MediaState>(() =>
    initialDetail ? mediaFromAssets(initialDetail.assets) : emptyMediaState(),
  );
  const [submitting, setSubmitting] = useState(false);
  const [autofillPending, setAutofillPending] = useState(false);
  const [mrbdCapableHint, setMrbdCapableHint] = useState(false);
  const [submittedName, setSubmittedName] = useState<string | null>(
    initialDetail?.status === "pending" || initialDetail?.status === "published"
      ? initialDetail.name
      : null,
  );

  const form = useForm({
    defaultValues: initialDetail ? valuesFromDetail(initialDetail) : emptyValues,
    validators: {
      onSubmit: submitFormValuesSchema,
    },
  }) as SubmitFormApi;

  async function ensureAppId(): Promise<string> {
    if (publicIdRef.current) return publicIdRef.current;
    if (ensurePromiseRef.current) return ensurePromiseRef.current;

    ensurePromiseRef.current = (async () => {
      const response = await fetch("/api/apps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stub: true }),
      });
      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }
      const data = (await response.json()) as DraftAppDto;
      publicIdRef.current = data.publicId;
      // Keep catalog fields in sync so submit works even if they haven't touched Type yet.
      if (!form.state.values.primaryCategoryId) {
        form.setFieldValue("listingType", data.listingType);
        form.setFieldValue("primaryCategoryId", data.primaryCategoryId);
      }
      await setPublicId(data.publicId);
      return data.publicId;
    })();

    try {
      return await ensurePromiseRef.current;
    } finally {
      ensurePromiseRef.current = null;
    }
  }

  if (submittedName !== null) {
    return (
      <SubmitConfirmation
        name={submittedName}
        publicId={publicIdRef.current ?? publicId ?? initialDetail?.publicId ?? ""}
      />
    );
  }

  const mediaReady = media.icon?.status === "ready";
  const mediaBusy =
    media.icon?.status === "uploading" ||
    media.video?.status === "uploading" ||
    media.screenshots.some((item) => item.status === "uploading");

  async function persistDraft(values: SubmitFormValues) {
    const id = await ensureAppId();
    const body = {
      ...values,
      description: values.description.trim() || null,
      secondaryCategoryId: values.secondaryCategoryId?.trim() || null,
    };

    const response = await fetch(`/api/apps/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(await parseApiError(response));
    }

    return id;
  }

  async function autosaveIfValid() {
    const result = submitFormValuesSchema.safeParse(form.state.values);
    if (!result.success) return;
    try {
      await persistDraft(result.data);
    } catch {
      // Silent autosave — submit will surface errors.
    }
  }

  /** Persist whatever autofill wrote even when contact email / category aren't ready yet. */
  async function persistAutofillPartial(fields: {
    name?: string;
    author?: string;
    description?: string;
    launchUrl: string;
  }) {
    const id = await ensureAppId();
    const body: {
      launchUrl: string;
      name?: string;
      author?: string;
      description?: string | null;
    } = {
      launchUrl: fields.launchUrl,
    };
    if (fields.name) body.name = fields.name;
    if (fields.author) body.author = fields.author;
    if (fields.description !== undefined) {
      body.description = fields.description.trim() || null;
    }

    const response = await fetch(`/api/apps/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(await parseApiError(response));
    }
  }

  async function handleAutofillFromUrl(launchUrl: string) {
    setAutofillPending(true);
    try {
      const response = await fetch("/api/apps/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: launchUrl }),
      });
      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      const metadata = (await response.json()) as AutofillMetadata;
      setMrbdCapableHint(metadata.mrbdCapable);

      const current = form.state.values;
      const filled: string[] = [];
      const partial: {
        name?: string;
        author?: string;
        description?: string;
        launchUrl: string;
      } = { launchUrl };

      if (metadata.name && isEmptyName(current.name)) {
        form.setFieldValue("name", metadata.name);
        partial.name = metadata.name;
        filled.push("name");
      }
      if (metadata.description && isEmptyDescription(current.description)) {
        form.setFieldValue("description", metadata.description);
        partial.description = metadata.description;
        filled.push("description");
      }
      if (metadata.author && isEmptyAuthor(current.author)) {
        form.setFieldValue("author", metadata.author);
        partial.author = metadata.author;
        filled.push("developer website");
      }

      let iconImported = false;
      const hasReadyIcon = media.icon?.status === "ready";
      if (metadata.iconUrl && !hasReadyIcon) {
        const placeholder: MediaItem = {
          localId: crypto.randomUUID(),
          kind: "icon",
          status: "uploading",
          progress: 0,
          sortOrder: 0,
        };
        setMedia((prev) => ({ ...prev, icon: placeholder }));

        try {
          const appId = await ensureAppId();
          const importResponse = await fetch("/api/apps/assets/import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ appId, kind: "icon", url: metadata.iconUrl }),
          });
          if (!importResponse.ok) {
            throw new Error(await parseApiError(importResponse));
          }
          const asset = (await importResponse.json()) as {
            id: string;
            kind: "icon";
            publicUrl: string;
            objectKey: string;
            sortOrder: number;
          };
          setMedia((prev) => ({
            ...prev,
            icon: {
              localId: asset.id,
              kind: "icon",
              status: "ready",
              progress: 100,
              assetId: asset.id,
              publicUrl: asset.publicUrl,
              objectKey: asset.objectKey,
              sortOrder: asset.sortOrder,
            },
          }));
          iconImported = true;
          filled.push("icon");
        } catch (error) {
          setMedia((prev) => ({
            ...prev,
            icon:
              prev.icon?.status === "uploading"
                ? {
                    ...prev.icon,
                    status: "error",
                    progress: 0,
                    error: error instanceof Error ? error.message : "Could not import icon",
                  }
                : prev.icon,
          }));
          toast.error(error instanceof Error ? error.message : "Could not import icon");
        }
      }

      if (filled.length > 0) {
        toast.success(`Filled ${filled.join(", ")} from the Web App URL.`);
        try {
          // Partial PATCH so name/description/author land even without contact email.
          await persistAutofillPartial(partial);
        } catch {
          // Fall back to full-schema autosave if partial failed (e.g. race).
          void autosaveIfValid();
        }
      } else {
        toast.message("Nothing new to fill — fields already have values or metadata was empty.");
      }

      for (const warning of metadata.warnings) {
        if (warning.toLowerCase().includes("icon") && !iconImported && !hasReadyIcon) {
          toast.message(warning);
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not auto-fill from URL");
    } finally {
      setAutofillPending(false);
    }
  }

  async function handleSubmitForReview() {
    const result = submitFormValuesSchema.safeParse(form.state.values);
    if (!result.success) {
      await form.handleSubmit();
      toast.error("Fix the Web App details before submitting.");
      return;
    }
    if (!mediaReady) {
      toast.error("Upload an icon before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const id = await persistDraft(result.data);

      const response = await fetch(`/api/apps/${id}/submit`, { method: "POST" });
      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      setSubmittedName(result.data.name);
      window.scrollTo({ top: 0, behavior: "smooth" });
      toast.success("Submitted for review");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <h1 className="font-bold text-3xl tracking-tight">Add your App</h1>
      <p className="mt-2 text-muted-foreground">
        Built something for Meta Ray-Ban Display glasses? Share it with the community. Fill in the
        details below and we&apos;ll review it before it goes live.
      </p>
      <form
        className="mt-8 space-y-10"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmitForReview();
        }}
      >
        <SubmitIconField
          media={media}
          onChange={setMedia}
          ensureAppId={ensureAppId}
          disabled={submitting || autofillPending}
        />

        <form.Subscribe selector={(state) => state.values.listingType}>
          {(listingType) => (
            <SubmitDetailsFields
              form={form}
              categories={categories}
              listingType={listingType}
              initialSecondaryCategoryId={initialDetail?.secondaryCategoryId}
              onBlurSave={() => void autosaveIfValid()}
              onAutofillFromUrl={(url) => void handleAutofillFromUrl(url)}
              autofillPending={autofillPending}
              mrbdCapableHint={mrbdCapableHint}
            />
          )}
        </form.Subscribe>

        {appsMediaEnabled ? (
          <SubmitMedia
            media={media}
            onChange={setMedia}
            ensureAppId={ensureAppId}
            disabled={submitting || autofillPending}
          />
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button
            type="submit"
            variant="brand"
            disabled={submitting || autofillPending || mediaBusy || !mediaReady}
          >
            {submitting ? "Submitting…" : "🚀 Submit app"}
          </Button>
          <form.Subscribe selector={(state) => state.values.launchUrl}>
            {(launchUrl) => {
              const href = simulatorHrefFor(launchUrl);
              if (!href) return null;
              return (
                <Link
                  href={href}
                  target="_blank"
                  className={cn(buttonVariants({ variant: "outline" }))}
                >
                  <Glasses data-icon="inline-start" />
                  Preview in simulator
                </Link>
              );
            }}
          </form.Subscribe>
        </div>
      </form>
    </>
  );
}
