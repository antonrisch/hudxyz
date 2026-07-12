"use client";

import type { ReactFormExtendedApi } from "@tanstack/react-form";
import { LockIcon } from "lucide-react";

import { OptionalMark } from "@/components/submit/optional-mark";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
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

export function SubmitDetailsFields({
  form,
  categories,
  listingType,
  onBlurSave,
}: {
  form: SubmitFormApi;
  categories: readonly SubmitCategoryOption[];
  listingType: ListingType;
  onBlurSave?: () => void;
}) {
  const categoryOptions = categories.filter((category) => category.listingType === listingType);

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
          return (
            <Field data-invalid={invalid}>
              <FieldLabel htmlFor={field.name}>Web App URL</FieldLabel>
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

      <form.Field name="listingType">
        {(field) => {
          const invalid = field.state.meta.errors.length > 0;
          return (
            <Field data-invalid={invalid} className="gap-2 *:data-[slot=toggle-group]:w-fit">
              <FieldLabel>Type</FieldLabel>
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
                  form.setFieldValue("primaryCategoryId", defaultCategoryId(categories, next));
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
              <FieldLabel htmlFor={field.name}>Category</FieldLabel>
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
                name={field.name}
                type="email"
                value={field.state.value}
                onBlur={() => {
                  field.handleBlur();
                  onBlurSave?.();
                }}
                onChange={(event) => field.handleChange(event.target.value)}
                aria-invalid={invalid}
                placeholder="you@example.com"
                autoComplete="email"
              />
              {invalid ? <FieldError errors={fieldErrors(field.state.meta.errors)} /> : null}
            </Field>
          );
        }}
      </form.Field>
    </FieldGroup>
  );
}
