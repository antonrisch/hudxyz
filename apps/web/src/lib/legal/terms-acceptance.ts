import { z } from "zod";

import { legal } from "./config";

export const submitTermsAcceptanceSchema = z.object({
  termsVersion: z.literal(legal.termsVersion),
  termsAccepted: z.literal(true),
});
