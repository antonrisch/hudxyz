import { permanentRedirect } from "next/navigation";

/** Legacy nested hub paths → flat directory. */
export default function LegacyHubsCatchAll() {
  permanentRedirect("/hubs");
}
