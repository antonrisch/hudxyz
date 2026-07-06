import type { MetadataRoute } from "next";
import { EMULATOR_TAGLINE } from "@/lib/emulator/config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "hud.xyz",
    short_name: "hud.xyz",
    description: EMULATOR_TAGLINE,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1cb6ac",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
