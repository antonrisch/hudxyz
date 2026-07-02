import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "hud.xyz",
    short_name: "hud.xyz",
    description: "Emulator for the Meta Ray-Ban Display.",
    start_url: "/emulator",
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
