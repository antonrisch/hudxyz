"use client";

import type { ReactFormExtendedApi } from "@tanstack/react-form";
import { LockIcon, PlusCircle } from "lucide-react";
import { useState } from "react";

import { OptionalMark } from "@/components/submit/optional-mark";
import { Button, buttonVariants } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ListingType } from "@/db/schema";
import { DESCRIPTION_MAX_LENGTH } from "@/lib/apps/copy-limits";
import { type SubmitFormValues, submitFormValuesSchema } from "@/lib/apps/draft-schema";

export type SubmitCategoryOption = {
  id: string;
  listingType: ListingType;
  slug: string;
  name: string;
};

/** Form API shaped by `useForm` in SubmitForm (onSubmit Zod only). */
export type SubmitFormApi = ReactFormExtendedApi<
  SubmitFormValues,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  typeof submitFormValuesSchema,
  undefined,
  undefined,
  undefined,
  undefined,
  never
>;

function fieldErrors(errors: unknown[]) {
  return errors.map((error) =>
    typeof error === "string" ? { message: error } : (error as { message?: string }),
  );
}

function defaultCategoryId(
  options: readonly SubmitCategoryOption[],
  listingType: ListingType,
): string {
  const forType = options.filter((category) => category.listingType === listingType);
  if (listingType === "app") {
    return forType.find((category) => category.slug === "utilities")?.id ?? forType[0]?.id ?? "";
  }
  return forType[0]?.id ?? "";
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function SubmitDetailsFields({
  form,
  categories,
  listingType,
  onBlurSave,
  initialSecondaryCategoryId,
  defaultCatalogOpen = false,
  onAutofillFromUrl,
  autofillPending = false,
  mrbdCapableHint = false,
}: {
  form: SubmitFormApi;
  categories: readonly SubmitCategoryOption[];
  listingType: ListingType;
  onBlurSave?: () => void;
  initialSecondaryCategoryId?: string | null;
  /** Review UI opens type/category by default; submit stays collapsed. */
  defaultCatalogOpen?: boolean;
  /** Submit page only — scrape metadata from the Web App URL. */
  onAutofillFromUrl?: (launchUrl: string) => void;
  autofillPending?: boolean;
  mrbdCapableHint?: boolean;
}) {
  const categoryOptions = categories.filter((category) => category.listingType === listingType);
  const [catalogOpen, setCatalogOpen] = useState(
    () => defaultCatalogOpen || listingType === "game" || Boolean(initialSecondaryCategoryId),
  );
  const [secondaryOpen, setSecondaryOpen] = useState(() => Boolean(initialSecondaryCategoryId));

  return (
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
                  onBlurSave?.();
                }}
                onChange={(event) => field.handleChange(event.target.value)}
                aria-invalid={invalid}
                placeholder="My Web App"
                autoComplete="off"
              />
              {invalid ? <FieldError errors={fieldErrors(field.state.meta.errors)} /> : null}
            </Field>
          );
        }}
      </form.Field>

      <form.Field name="launchUrl">
        {(field) => {
          const invalid = field.state.meta.errors.length > 0;
          const canAutofill = Boolean(onAutofillFromUrl) && isHttpUrl(field.state.value.trim());
          return (
            <Field data-invalid={invalid}>
              <FieldLabel htmlFor={field.name}>Web App URL</FieldLabel>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                <Input
                  id={field.name}
                  name={field.name}
                  type="url"
                  value={field.state.value}
                  onBlur={() => {
                    field.handleBlur();
                    onBlurSave?.();
                  }}
                  onChange={(event) => field.handleChange(event.target.value)}
                  aria-invalid={invalid}
                  placeholder="https://example.com/my-web-app"
                  autoComplete="url"
                  className="sm:min-w-0 sm:flex-1"
                />
                {onAutofillFromUrl ? (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={!canAutofill || autofillPending}
                    onClick={() => onAutofillFromUrl(field.state.value.trim())}
                    className="shrink-0"
                  >
                    {autofillPending ? "Fetching…" : "Auto-fill from URL"}
                  </Button>
                ) : null}
              </div>
              {mrbdCapableHint ? (
                <FieldDescription>Detected MRBD-capable metadata on this page.</FieldDescription>
              ) : null}
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
                    onBlurSave?.();
                  }}
                  onChange={(event) => field.handleChange(event.target.value)}
                  aria-invalid={invalid}
                  placeholder="What it does and how to use it on Meta Ray-Ban Display…"
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

      <Field className="gap-0">
        <Collapsible open={catalogOpen} onOpenChange={setCatalogOpen}>
          <CollapsibleTrigger className="flex w-full items-start justify-between gap-3 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <FieldTitle>
                Type & category
                <OptionalMark />
              </FieldTitle>
            </div>
            <span className={buttonVariants({ variant: "secondary", size: "sm" })}>
              {catalogOpen ? "Hide" : "Show"}
            </span>
          </CollapsibleTrigger>

          <CollapsibleContent className="mt-4 space-y-4">
            <form.Field name="listingType">
              {(field) => {
                const invalid = field.state.meta.errors.length > 0;
                return (
                  <Field data-invalid={invalid} className="gap-2 *:data-[slot=toggle-group]:w-fit">
                    <FieldLabel>
                      Type
                      <OptionalMark />
                    </FieldLabel>
                    <ToggleGroup
                      variant="outline"
                      aria-label="Web App type"
                      aria-invalid={invalid}
                      className="w-fit!"
                      value={[field.state.value]}
                      onValueChange={(values) => {
                        const next = values[0] as ListingType | undefined;
                        if (!next) return;
                        field.handleChange(next);
                        form.setFieldValue(
                          "primaryCategoryId",
                          defaultCategoryId(categories, next),
                        );
                        form.setFieldValue("secondaryCategoryId", "");
                        setSecondaryOpen(false);
                        onBlurSave?.();
                      }}
                    >
                      <ToggleGroupItem value="app">App</ToggleGroupItem>
                      <ToggleGroupItem value="game">Game</ToggleGroupItem>
                    </ToggleGroup>
                    {invalid ? <FieldError errors={fieldErrors(field.state.meta.errors)} /> : null}
                  </Field>
                );
              }}
            </form.Field>

            <form.Field name="primaryCategoryId">
              {(field) => {
                const invalid = field.state.meta.errors.length > 0;
                return (
                  <Field data-invalid={invalid}>
                    <FieldLabel htmlFor={field.name}>
                      Category
                      <OptionalMark />
                    </FieldLabel>
                    <NativeSelect
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      aria-invalid={invalid}
                      className="w-full"
                      onBlur={() => {
                        field.handleBlur();
                        onBlurSave?.();
                      }}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        onBlurSave?.();
                      }}
                    >
                      <NativeSelectOption value="">Select…</NativeSelectOption>
                      {categoryOptions.map((category) => (
                        <NativeSelectOption key={category.id} value={category.id}>
                          {category.name}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                    {invalid ? <FieldError errors={fieldErrors(field.state.meta.errors)} /> : null}
                  </Field>
                );
              }}
            </form.Field>

            {secondaryOpen ? (
              <form.Field name="secondaryCategoryId">
                {(field) => {
                  const invalid = field.state.meta.errors.length > 0;
                  return (
                    <Field data-invalid={invalid}>
                      <div className="flex items-center justify-between gap-2">
                        <FieldLabel htmlFor={field.name}>
                          Secondary category
                          <OptionalMark />
                        </FieldLabel>
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          className="text-muted-foreground"
                          onClick={() => {
                            field.handleChange("");
                            setSecondaryOpen(false);
                            onBlurSave?.();
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                      <NativeSelect
                        id={field.name}
                        name={field.name}
                        value={field.state.value ?? ""}
                        aria-invalid={invalid}
                        className="w-full"
                        onBlur={() => {
                          field.handleBlur();
                          onBlurSave?.();
                        }}
                        onChange={(event) => {
                          field.handleChange(event.target.value);
                          onBlurSave?.();
                        }}
                      >
                        <NativeSelectOption value="">Select…</NativeSelectOption>
                        {categoryOptions.map((category) => (
                          <NativeSelectOption key={category.id} value={category.id}>
                            {category.name}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                      {invalid ? (
                        <FieldError errors={fieldErrors(field.state.meta.errors)} />
                      ) : null}
                    </Field>
                  );
                }}
              </form.Field>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-fit px-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
                onClick={() => setSecondaryOpen(true)}
              >
                <PlusCircle data-icon="inline-start" /> Add secondary category
              </Button>
            )}
          </CollapsibleContent>
        </Collapsible>
      </Field>

      <form.Field name="author">
        {(field) => {
          const invalid = field.state.meta.errors.length > 0;
          return (
            <Field data-invalid={invalid}>
              <FieldLabel htmlFor={field.name}>Developer website</FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={() => {
                  field.handleBlur();
                  onBlurSave?.();
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

      <form.Field name="contactEmail">
        {(field) => {
          const invalid = field.state.meta.errors.length > 0;
          return (
            <Field data-invalid={invalid}>
              <FieldLabel htmlFor={field.name}>Contact email</FieldLabel>
              <FieldDescription className="inline-flex items-center gap-1.5">
                <LockIcon className="size-3 shrink-0" strokeWidth={2.5} aria-hidden />
                Private. Used only to contact you about this Web App submission.
              </FieldDescription>
              <Input
                id={field.name}
                name="email"
                type="email"
                inputMode="email"
                value={field.state.value}
                onBlur={() => {
                  field.handleBlur();
                  onBlurSave?.();
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
    </FieldGroup>
  );
}
