import type { NextConfig } from "next";

// cross-origin isolation for the scramjet wasm rewriter (SharedArrayBuffer).
// scoped to the emulator pages so marketing routes keep loading cross-origin assets.
const isolation = [
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
];

// first-party MRBD apps can be embedded by the isolated emulator.
const appIsolation = [
  { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: "/emulator", headers: isolation },
      { source: "/apps/:path*", headers: appIsolation },
      { source: "/sw.js", headers: [{ key: "Service-Worker-Allowed", value: "/" }] },
    ];
  },
  // /browser folded into the emulator spa.
  async redirects() {
    return [
      { source: "/browser", destination: "/emulator", permanent: true },
      // index.html keeps relative asset paths under /apps/snake/
      { source: "/apps/snake", destination: "/apps/snake/index.html", permanent: false },
    ];
  },
};

export default nextConfig;
