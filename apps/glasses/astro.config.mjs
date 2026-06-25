// @ts-check
import { defineConfig } from "astro/config";

import tailwindcss from "@tailwindcss/vite";
import solid from "@astrojs/solid-js";

// https://astro.build/config
export default defineConfig({
  integrations: [solid()],

  vite: {
    plugins: [tailwindcss()],
    server: {
      allowedHosts: [".ngrok-free.app", ".ngrok.app"],
      hmr: { clientPort: 443 },
    },
  },
});
