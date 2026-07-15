import { vercelAdapter } from "@flags-sdk/vercel";
import { flag } from "flags/next";

/**
 * When true: submitters can upload screenshots + preview video, and listing
 * pages show the ListingMedia carousel. Icon uploads/display are always on.
 */
export const appsMedia = flag<boolean>({
  key: "apps-media",
  description: "Show screenshots/preview on listing pages and allow those uploads on /apps/submit",
  adapter: vercelAdapter(),
  defaultValue: false,
  options: [
    { value: false, label: "Off" },
    { value: true, label: "On" },
  ],
});
