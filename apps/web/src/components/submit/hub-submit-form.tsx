"use client";

import { useForm } from "@tanstack/react-form";
import { Glasses, LockIcon } from "lucide-react";
import Link from "next/link";
import { parseAsString, useQueryState } from "nuqs";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { HubLogoField } from "@/components/submit/hub-logo-field";
import { OptionalMark } from "@/components/submit/optional-mark";
import { SubmitConfirmation } from "@/components/submit/submit-confirmation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { track } from "@/lib/analytics/track";
import { DESCRIPTION_MAX_LENGTH } from "@/lib/hubs/copy-limits";
import { parseApiError } from "@/lib/hubs/api-error";
import {
  type DraftDetailDto,
  DRAFT_STUB_CONTACT_EMAIL,
  DRAFT_STUB_HOMEPAGE,
  isDraftStub,
} from "@/lib/hubs/draft";
import { type SubmitHubFormValues, submitHubFormValuesSchema } from "@/lib/hubs/draft-schema";
import {
  deleteHubLogo,
  emptyLogoState,
  logoFromUrl,
  type LogoState,
  uploadHubLogo,
  validateLogoFile,
} from "@/lib/hubs/upload-client";
import { legal } from "@/lib/legal/config";
import { cn } from "@/lib/utils";

const emptyValues: SubmitHubFormValues = {
  name: "",
  homepage: "",
  contactEmail: "",
  launchUrl: "",
  description: "",
};

function valuesFromDetail(detail: DraftDetailDto): SubmitHubFormValues {
  if (isDraftStub(detail)) {
    return emptyValues;
  }
  return {
    name: detail.name === "Untitled" ? "" : detail.name,
    homepage: detail.homepage === DRAFT_STUB_HOMEPAGE ? "" : detail.homepage,
    contactEmail: detail.contactEmail === DRAFT_STUB_CONTACT_EMAIL ? "" : detail.contactEmail,
    launchUrl: detail.launchUrl,
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

function fieldErrors(errors: unknown[]) {
  return errors.map((error) =>
    typeof error === "string" ? { message: error } : (error as { message?: string }),
  );
}

export function HubSubmitForm({ initialDetail }: { initialDetail: DraftDetailDto | null }) {
  const [publicId, setPublicId] = useQueryState("id", parseAsString);
  const publicIdRef = useRef<string | null>(publicId ?? initialDetail?.publicId ?? null);
  const ensurePromiseRef = useRef<Promise<string> | null>(null);

  const [logo, setLogo] = useState<LogoState>(() =>
    logoFromUrl(initialDetail?.logoUrl, initialDetail?.logoObjectKey),
  );
  const [submitted, setSubmitted] = useState<{ name: string; publicId: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm({
    defaultValues: initialDetail ? valuesFromDetail(initialDetail) : emptyValues,
    validators: {
      onSubmit: submitHubFormValuesSchema,
    },
  });

  async function ensureHubId(): Promise<string> {
    if (publicIdRef.current) return publicIdRef.current;
    if (ensurePromiseRef.current) return ensurePromiseRef.current;

    ensurePromiseRef.current = (async () => {
      const response = await fetch("/api/hubs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stub: true }),
      });
      if (!response.ok) throw new Error(await parseApiError(response));
      const created = (await response.json()) as { publicId: string };
      publicIdRef.current = created.publicId;
      await setPublicId(created.publicId);
      track("submission_started", { public_id: created.publicId });
      return created.publicId;
    })();

    try {
      return await ensurePromiseRef.current;
    } finally {
      ensurePromiseRef.current = null;
    }
  }

  async function autosave(values: SubmitHubFormValues) {
    const parsed = submitHubFormValuesSchema.safeParse(values);
    if (!parsed.success) return;

    try {
      const id = await ensureHubId();
      const response = await fetch(`/api/hubs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...parsed.data,
          description: parsed.data.description.trim() ? parsed.data.description : null,
        }),
      });
      if (!response.ok) throw new Error(await parseApiError(response));
    } catch {
      // Quiet autosave — submit surfaces errors.
    }
  }

  async function onLogoSelected(file: File) {
    const validationError = validateLogoFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setLogo({ status: "uploading", progress: 0, fileName: file.name });
    try {
      const id = await ensureHubId();
      const result = await uploadHubLogo({
        hubId: id,
        file,
        onProgress: (progress) => setLogo((prev) => ({ ...prev, progress })),
      });
      setLogo({
        status: "ready",
        progress: 100,
        publicUrl: result.publicUrl,
        objectKey: result.objectKey,
        fileName: file.name,
      });
    } catch (error) {
      setLogo({
        status: "error",
        progress: 0,
        error: error instanceof Error ? error.message : "Upload failed",
      });
      toast.error(error instanceof Error ? error.message : "Upload failed");
    }
  }

  async function onLogoClear() {
    if (!publicIdRef.current) {
      setLogo(emptyLogoState());
      return;
    }
    try {
      await deleteHubLogo(publicIdRef.current);
      setLogo(emptyLogoState());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove logo");
    }
  }

  async function onSubmit() {
    const values = form.state.values;
    const parsed = submitHubFormValuesSchema.safeParse(values);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Fix the form errors");
      return;
    }
    if (logo.status === "uploading") {
      toast.error("Wait for the logo upload to finish.");
      return;
    }
    if (logo.status !== "ready") {
      toast.error("Upload a logo before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const id = await ensureHubId();
      const patchResponse = await fetch(`/api/hubs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...parsed.data,
          description: parsed.data.description.trim() ? parsed.data.description : null,
        }),
      });
      if (!patchResponse.ok) throw new Error(await parseApiError(patchResponse));

      // Clicking Submit is the acceptance act — server still validates version + literal true.
      const submitResponse = await fetch(`/api/hubs/${id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          termsVersion: legal.termsVersion,
          termsAccepted: true,
        }),
      });
      if (!submitResponse.ok) throw new Error(await parseApiError(submitResponse));

      track("submission_completed", { public_id: id });
      window.scrollTo({ top: 0, behavior: "smooth" });
      toast.success("Submitted for review");
      setSubmitted({ name: parsed.data.name, publicId: id });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return <SubmitConfirmation name={submitted.name} publicId={submitted.publicId} />;
  }

  const submitDisabled = submitting || logo.status === "uploading" || logo.status !== "ready";

  return (
    <>
      <h1 className="font-bold text-3xl tracking-tight">Submit a Hub</h1>
      <p className="mt-2 text-muted-foreground">
        List your studio or developer hub in the directory. Fill in the details below and we&apos;ll
        review it before it goes live.
      </p>

      <form
        className="mt-8 space-y-10"
        data-sentry-mask
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit();
        }}
      >
        <HubLogoField
          logo={logo}
          disabled={submitting}
          onPick={(file) => void onLogoSelected(file)}
          onClear={() => void onLogoClear()}
        />

        <FieldGroup>
          <form.Field name="name">
            {(field) => {
              const invalid = field.state.meta.errors.length > 0;
              return (
                <Field data-invalid={invalid}>
                  <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={() => {
                      field.handleBlur();
                      void autosave(form.state.values);
                    }}
                    onChange={(event) => field.handleChange(event.target.value)}
                    aria-invalid={invalid}
                    placeholder="Acme Studio"
                    autoComplete="off"
                  />
                  {invalid ? <FieldError errors={fieldErrors(field.state.meta.errors)} /> : null}
                </Field>
              );
            }}
          </form.Field>

          <form.Field name="homepage">
            {(field) => {
              const invalid = field.state.meta.errors.length > 0;
              return (
                <Field data-invalid={invalid}>
                  <FieldLabel htmlFor={field.name}>Homepage</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="url"
                    value={field.state.value}
                    onBlur={() => {
                      field.handleBlur();
                      void autosave(form.state.values);
                    }}
                    onChange={(event) => field.handleChange(event.target.value)}
                    aria-invalid={invalid}
                    placeholder="https://example.com"
                    autoComplete="url"
                    spellCheck={false}
                  />
                  {invalid ? <FieldError errors={fieldErrors(field.state.meta.errors)} /> : null}
                </Field>
              );
            }}
          </form.Field>

          <form.Field name="launchUrl">
            {(field) => {
              const invalid = field.state.meta.errors.length > 0;
              return (
                <Field data-invalid={invalid}>
                  <FieldLabel htmlFor={field.name}>Hub Launch URL</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="url"
                    value={field.state.value}
                    onBlur={() => {
                      field.handleBlur();
                      void autosave(form.state.values);
                    }}
                    onChange={(event) => field.handleChange(event.target.value)}
                    aria-invalid={invalid}
                    placeholder="https://example.com/mrbd"
                    autoComplete="url"
                    spellCheck={false}
                  />
                  <FieldDescription>
                    Where the 'Try button' opens the simulator to.
                  </FieldDescription>
                  {invalid ? <FieldError errors={fieldErrors(field.state.meta.errors)} /> : null}
                </Field>
              );
            }}
          </form.Field>

          <form.Field name="contactEmail">
            {(field) => {
              const invalid = field.state.meta.errors.length > 0;
              return (
                <Field data-invalid={invalid}>
                  <FieldLabel htmlFor={field.name}>Contact email</FieldLabel>
                  <FieldDescription className="inline-flex items-center gap-1.5">
                    <LockIcon className="size-3 shrink-0" strokeWidth={2.5} aria-hidden />
                    Private. Used only to contact you about this hub submission.
                  </FieldDescription>
                  <Input
                    id={field.name}
                    name="email"
                    type="email"
                    inputMode="email"
                    value={field.state.value}
                    onBlur={() => {
                      field.handleBlur();
                      void autosave(form.state.values);
                    }}
                    onChange={(event) => field.handleChange(event.target.value)}
                    aria-invalid={invalid}
                    placeholder="you@example.com"
                    autoComplete="email"
                    spellCheck={false}
                  />
                  {invalid ? <FieldError errors={fieldErrors(field.state.meta.errors)} /> : null}
                </Field>
              );
            }}
          </form.Field>

          <form.Field name="description">
            {(field) => {
              const invalid = field.state.meta.errors.length > 0;
              const length = String(field.state.value ?? "").length;
              return (
                <Field data-invalid={invalid}>
                  <FieldLabel htmlFor={field.name}>
                    Description
                    <OptionalMark />
                  </FieldLabel>
                  <div className="relative">
                    <Textarea
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={() => {
                        field.handleBlur();
                        void autosave(form.state.values);
                      }}
                      onChange={(event) => field.handleChange(event.target.value)}
                      aria-invalid={invalid}
                      placeholder="What your hub ships for Meta Ray-Ban Display…"
                      className="min-h-28 pb-7"
                    />
                    <span className="pointer-events-none absolute right-2 bottom-1.5 rounded-sm bg-background px-1 py-0.5 text-muted-foreground text-sm">
                      {length}/{DESCRIPTION_MAX_LENGTH}
                    </span>
                  </div>
                  {invalid ? <FieldError errors={fieldErrors(field.state.meta.errors)} /> : null}
                </Field>
              );
            }}
          </form.Field>
        </FieldGroup>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <Button type="submit" variant="brand" size="lg" disabled={submitDisabled}>
              {submitting ? "Submitting…" : "Submit for review"}
            </Button>
            <form.Subscribe selector={(state) => state.values.launchUrl}>
              {(launchUrl) => {
                const href = simulatorHrefFor(launchUrl);
                if (!href) return null;
                return (
                  <Link
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
                  >
                    <Glasses data-icon="inline-start" />
                    Preview in simulator
                  </Link>
                );
              }}
            </form.Subscribe>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            By clicking submit, you confirm you have authority and rights to the hub and media,
            agree to the{" "}
            <Link href="/terms" className="underline underline-offset-4 hover:text-foreground">
              Terms of Service
            </Link>{" "}
            ({legal.termsVersion}), and acknowledge the{" "}
            <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </form>
    </>
  );
}
