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
import { SubmitMedia } from "@/components/submit/submit-media";
import { Button, buttonVariants } from "@/components/ui/button";
import { parseApiError } from "@/lib/apps/api-error";
import {
  type DraftAppDto,
  type DraftDetailDto,
  DRAFT_STUB_CONTACT_EMAIL,
  isDraftStub,
} from "@/lib/apps/draft";
import { type SubmitFormValues, submitFormValuesSchema } from "@/lib/apps/draft-schema";
import { emptyMediaState, mediaFromAssets, type MediaState } from "@/lib/apps/upload-client";

const emptyValues: SubmitFormValues = {
  name: "",
  author: "",
  contactEmail: "",
  launchUrl: "",
  listingType: "app",
  primaryCategoryId: "",
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

export function SubmitForm({
  categories,
  initialDetail,
}: {
  categories: readonly SubmitCategoryOption[];
  initialDetail: DraftDetailDto | null;
}) {
  // `?id=` is the public id (10-char Crockford), not the internal uuid.
  const [publicId, setPublicId] = useQueryState("id", parseAsString);
  const publicIdRef = useRef<string | null>(publicId ?? initialDetail?.publicId ?? null);
  const ensurePromiseRef = useRef<Promise<string> | null>(null);

  const [media, setMedia] = useState<MediaState>(() =>
    initialDetail ? mediaFromAssets(initialDetail.assets) : emptyMediaState(),
  );
  const [submitting, setSubmitting] = useState(false);
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
        <form.Subscribe selector={(state) => state.values.listingType}>
          {(listingType) => (
            <SubmitDetailsFields
              form={form}
              categories={categories}
              listingType={listingType}
              onBlurSave={() => void autosaveIfValid()}
            />
          )}
        </form.Subscribe>

        <SubmitMedia
          media={media}
          onChange={setMedia}
          ensureAppId={ensureAppId}
          disabled={submitting}
        />

        <div className="flex flex-wrap gap-2">
          <form.Subscribe selector={(state) => state.values.launchUrl}>
            {(launchUrl) => {
              const href = simulatorHrefFor(launchUrl);
              if (!href) return null;
              return (
                <Link
                  href={href}
                  target="_blank"
                  className={buttonVariants({ variant: "outline" })}
                >
                  <Glasses data-icon="inline-start" />
                  Preview in simulator
                </Link>
              );
            }}
          </form.Subscribe>
          <Button type="submit" variant="brand" disabled={submitting || mediaBusy || !mediaReady}>
            {submitting ? "Submitting…" : "Submit for review"}
          </Button>
        </div>
      </form>
    </>
  );
}
