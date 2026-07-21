import type { NextConfig } from "next";
import { withBotId } from "botid/next/config";
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

const marketingHeaders = [
  ...baseSecurity,
  ...permissionsDenyMedia,
  { key: "X-Frame-Options", value: "DENY" },
];

const marketingRoutes = [
  "/",
  "/hubs",
  "/hubs/:path*",
  "/padme",
  "/padme/:path*",
  "/privacy",
  "/terms",
  "/dev",
  "/api/:path*",
] as const;

const nextConfig: NextConfig = {
  images: {
    // Prod `assets.hudxyz.com` plus env hosts like `assets-kenobi.hudxyz.com`.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.hudxyz.com",
        pathname: "/**",
      },
    ],
  },
  async redirects() {
    return [
      { source: "/apps", destination: "/hubs", permanent: true },
      { source: "/apps/submit", destination: "/hubs/submit", permanent: true },
      { source: "/apps/submit/:path*", destination: "/hubs/submit/:path*", permanent: true },
      { source: "/apps/:path*", destination: "/hubs", permanent: true },
    ];
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
      ...marketingRoutes.map((source) => ({ source, headers: marketingHeaders })),
      { source: "/_next/static/:path*", headers: corpSameOrigin },
      { source: "/backgrounds/:path*", headers: corpSameOrigin },
      { source: "/suggested-apps/:path*", headers: corpSameOrigin },
      { source: "/icon.svg", headers: corpSameOrigin },
      { source: "/apple-icon.png", headers: corpSameOrigin },
      { source: "/sw.js", headers: [{ key: "Service-Worker-Allowed", value: "/" }] },
    ];
  },
};

const withBot = withBotId(nextConfig);

export default process.env.NODE_ENV === "development"
  ? withBot
  : withSentryConfig(withBot, {
      org: "hudxyz",
      project: "web",
      authToken: process.env.SENTRY_AUTH_TOKEN,
      widenClientFileUpload: true,
      tunnelRoute: "/monitoring",
      silent: !process.env.CI,
    });
