import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// cross-origin isolation for the scramjet wasm rewriter (SharedArrayBuffer).
// scoped to the simulator pages so marketing routes keep loading cross-origin assets.
const isolation = [
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
];

// first-party MRBD apps load in the simulator iframe (same-origin, el.src — not scramjet).
const appHeaders = [
  { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
];

const baseSecurity = [
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

// Hard-deny camera on non-simulator routes. On `/`, omit camera=() — Chrome probes the
// camera policy during getDisplayMedia and logs a Violation even though we only capture
// the tab (Region Capture). display-capture must be allowed for Path A recording.
const permissionsDenyMedia = [
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];
const permissionsSimulator = [
  {
    key: "Permissions-Policy",
    value: "display-capture=(self), microphone=(), geolocation=(), interest-cohort=()",
  },
];

// COEP require-corp on / needs CORP on embeddable first-party assets (fonts, images).
const corpSameOrigin = [{ key: "Cross-Origin-Resource-Policy", value: "same-origin" }];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "assets.hudxyz.com",
        pathname: "/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/apps/:path*",
        headers: [...baseSecurity, ...permissionsDenyMedia, ...appHeaders],
      },
      {
        // Simulator: isolation + display-capture. Do not also send camera=().
        source: "/",
        headers: [
          ...baseSecurity,
          ...permissionsSimulator,
          ...isolation,
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
      {
        // Everything else (except /apps/* and exact /): deny framing + camera.
        source: "/((?!apps(?:/|$)|$).*)",
        headers: [
          ...baseSecurity,
          ...permissionsDenyMedia,
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
      { source: "/_next/static/:path*", headers: corpSameOrigin },
      { source: "/backgrounds/:path*", headers: corpSameOrigin },
      { source: "/suggested-apps/:path*", headers: corpSameOrigin },
      { source: "/icon.svg", headers: corpSameOrigin },
      { source: "/apple-icon.png", headers: corpSameOrigin },
      { source: "/sw.js", headers: [{ key: "Service-Worker-Allowed", value: "/" }] },
    ];
  },
  async redirects() {
    return [
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
