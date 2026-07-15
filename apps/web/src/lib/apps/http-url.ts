import { z } from "zod";

/** Shared http(s) URL field for submit autofill / asset import bodies. */
export function httpUrlSchema(invalidMessage: string, protocolMessage: string) {
  return z
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
}
