import type { NextConfig } from "next";

// cross-origin isolation for the scramjet wasm rewriter (SharedArrayBuffer).
// scoped to the emulator pages so marketing routes keep loading cross-origin assets.
const isolation = [
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: "/emulator", headers: isolation },
      { source: "/sw.js", headers: [{ key: "Service-Worker-Allowed", value: "/" }] },
    ];
  },
  // /browser folded into the emulator spa; its bare debug box is now the "fit" view.
  async redirects() {
    return [
      { source: "/browser", destination: "/emulator?view=fit", permanent: true },
      // index.html keeps relative asset paths under /apps/snake/
      { source: "/apps/snake", destination: "/apps/snake/index.html", permanent: false },
    ];
  },
};

export default nextConfig;
