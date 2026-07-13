import { z } from "zod";

import { listingTypes } from "@/db/schema";

import { DESCRIPTION_MAX_LENGTH } from "./copy-limits";

/** Public Web App path crumb: lowercase kebab-case, 1-48 chars. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const draftAppFieldsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required.")
    .max(80, "Name must be at most 80 characters."),
  author: z
    .string()
    .trim()
    .min(1, "Developer website is required.")
    .max(200, "Developer website must be at most 200 characters.")
    .refine((value) => {
      if (/^https?:\/\//i.test(value)) {
        try {
          const url = new URL(value);
          return url.protocol === "http:" || url.protocol === "https:";
        } catch {
          return false;
        }
      }
      return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(value);
    }, "Enter a website URL or domain, like example.com."),
  contactEmail: z
    .email({ error: "Enter a valid email address." })
    .trim()
    .min(1, "Contact email is required.")
    .max(254, "Contact email must be at most 254 characters."),
  launchUrl: z
    .url({ error: "Enter a valid Web App URL." })
    .trim()
    .refine((value) => {
      try {
        const protocol = new URL(value).protocol;
        return protocol === "http:" || protocol === "https:";
      } catch {
        return false;
      }
    }, "Web App URL must start with http:// or https://"),
  listingType: z.enum(listingTypes),
  primaryCategoryId: z.string().trim().min(1, "Primary category is required."),
  secondaryCategoryId: z
    .union([z.string().trim(), z.null()])
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
  description: z
    .union([
      z
        .string()
        .trim()
        .max(
          DESCRIPTION_MAX_LENGTH,
          `Description must be at most ${DESCRIPTION_MAX_LENGTH} characters.`,
        ),
      z.null(),
    ])
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
  targetDevice: z.string().trim().min(1).max(32).optional().default("mrbd"),
});

export type DraftAppFields = z.infer<typeof draftAppFieldsSchema>;

/** PATCH accepts a partial of create fields (after transforms). */
export const draftAppPatchSchema = draftAppFieldsSchema.partial();

export type DraftAppPatch = z.infer<typeof draftAppPatchSchema>;

/** Client form values before optional fields are normalized to null. */
export const submitFormValuesSchema = draftAppFieldsSchema.omit({ targetDevice: true }).extend({
  description: z
    .string()
    .trim()
    .max(
      DESCRIPTION_MAX_LENGTH,
      `Description must be at most ${DESCRIPTION_MAX_LENGTH} characters.`,
    ),
  secondaryCategoryId: z.string(),
});

export type SubmitFormValues = z.infer<typeof submitFormValuesSchema>;

export function slugifyName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug.length > 0 ? slug : "app";
}
