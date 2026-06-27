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
      { source: "/browser", headers: isolation },
      { source: "/sw.js", headers: [{ key: "Service-Worker-Allowed", value: "/" }] },
    ];
  },
};

export default nextConfig;
