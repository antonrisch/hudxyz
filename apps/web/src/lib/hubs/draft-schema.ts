import { z } from "zod";

import { DESCRIPTION_MAX_LENGTH } from "./copy-limits";

/** Public path crumb: lowercase kebab-case, 1-48 chars. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const httpUrl = (invalidMessage: string, protocolMessage: string) =>
  z
    .url({ error: invalidMessage })
    .trim()
    .refine((value) => {
      try {
        const protocol = new URL(value).protocol;
        return protocol === "http:" || protocol === "https:";
      } catch {
        return false;
      }
    }, protocolMessage);

export const draftHubFieldsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required.")
    .max(80, "Name must be at most 80 characters."),
  homepage: httpUrl("Enter a valid homepage URL.", "Homepage must start with http:// or https://"),
  contactEmail: z
    .email({ error: "Enter a valid email address." })
    .trim()
    .min(1, "Contact email is required.")
    .max(254, "Contact email must be at most 254 characters."),
  launchUrl: httpUrl("Enter a valid launch URL.", "Launch URL must start with http:// or https://"),
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
});

export type DraftHubFields = z.infer<typeof draftHubFieldsSchema>;

export const draftHubPatchSchema = draftHubFieldsSchema.partial();

export type DraftHubPatch = z.infer<typeof draftHubPatchSchema>;

/** Client form values before optional fields are normalized to null. */
export const submitHubFormValuesSchema = draftHubFieldsSchema.extend({
  description: z
    .string()
    .trim()
    .max(
      DESCRIPTION_MAX_LENGTH,
      `Description must be at most ${DESCRIPTION_MAX_LENGTH} characters.`,
    ),
});

export type SubmitHubFormValues = z.infer<typeof submitHubFormValuesSchema>;

export function slugifyName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug.length > 0 ? slug : "hub";
}
