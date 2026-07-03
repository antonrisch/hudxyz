import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// cross-origin isolation for the scramjet wasm rewriter (SharedArrayBuffer).
// scoped to the emulator pages so marketing routes keep loading cross-origin assets.
const isolation = [
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
];

// first-party MRBD apps load in the emulator iframe (same-origin, el.src — not scramjet).
const appHeaders = [
  { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
];

const baseSecurity = [
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/apps/:path*",
        headers: [...baseSecurity, ...appHeaders],
      },
      {
        // deny external framing everywhere except /apps/* (embedded by /emulator).
        source: "/((?!apps).*)",
        headers: [...baseSecurity, { key: "X-Frame-Options", value: "DENY" }],
      },
      { source: "/emulator", headers: isolation },
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

export default process.env.NODE_ENV === "development"
  ? nextConfig
  : withSentryConfig(nextConfig, {
      org: "hudxyz",
      project: "web",
      authToken: process.env.SENTRY_AUTH_TOKEN,
      widenClientFileUpload: true,
      tunnelRoute: "/monitoring",
      silent: !process.env.CI,
    });
