import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// cross-origin isolation for the scramjet wasm rewriter (SharedArrayBuffer).
// scoped to the simulator pages so marketing routes keep loading cross-origin assets.
const isolation = [
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
];

const baseSecurity = [
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

// Hard-deny camera on non-simulator routes. On `/simulator`, omit camera=() — Chrome probes
// the camera policy during getDisplayMedia and logs a Violation even though we only capture
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

// COEP require-corp on /simulator needs CORP on embeddable first-party assets (fonts, images).
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
        // Simulator: isolation + display-capture. Do not also send camera=().
        source: "/simulator",
        headers: [
          ...baseSecurity,
          ...permissionsSimulator,
          ...isolation,
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
      {
        // Directory, legal, and other non-simulator pages (no COEP — R2 images must load).
        source: "/apps",
        headers: [
          ...baseSecurity,
          ...permissionsDenyMedia,
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
      {
        source: "/apps/:path*",
        headers: [
          ...baseSecurity,
          ...permissionsDenyMedia,
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
      {
        source: "/privacy",
        headers: [
          ...baseSecurity,
          ...permissionsDenyMedia,
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
      {
        source: "/terms",
        headers: [
          ...baseSecurity,
          ...permissionsDenyMedia,
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
      {
        source: "/dev",
        headers: [
          ...baseSecurity,
          ...permissionsDenyMedia,
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
      {
        source: "/api/:path*",
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
