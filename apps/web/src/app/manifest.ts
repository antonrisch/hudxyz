import type { MetadataRoute } from "next";
import { SIMULATOR_TAGLINE } from "@/lib/simulator/config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "hudxyz.com",
    short_name: "hudxyz.com",
    description: SIMULATOR_TAGLINE,
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
