import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

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

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

const vercelAnalytics = "https://vitals.vercel-insights.com https://va.vercel-scripts.com";

function wispConnectOrigins(): string {
  const raw = process.env.NEXT_PUBLIC_WISP_URL;
  if (!raw) return "ws://localhost:4000 wss://kenobi.hudbox.dev";
  try {
    const { protocol, host } = new URL(raw);
    if (protocol === "ws:" || protocol === "wss:") return `${protocol}//${host}`;
    const wsProtocol = protocol === "https:" ? "wss:" : "ws:";
    return `${wsProtocol}//${host}`;
  } catch {
    return "wss://kenobi.hudbox.dev";
  }
}

// marketing + legal routes: tight csp. emulator is excluded (proxied apps + wasm need more room).
const siteCsp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  `connect-src 'self' ${vercelAnalytics}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const emulatorCsp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self' ${wispConnectOrigins()} ${vercelAnalytics}`,
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  "frame-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // exclude emulator shell, proxy assets, sentry tunnel, and the service worker.
        source: "/((?!emulator|sw\\.js|scramjet|controller|monitoring).*)",
        headers: [{ key: "Content-Security-Policy", value: siteCsp }],
      },
      {
        source: "/emulator",
        headers: [...isolation, { key: "Content-Security-Policy", value: emulatorCsp }],
      },
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

export default withSentryConfig(nextConfig, {
  org: "hudxyz",
  project: "web",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  silent: !process.env.CI,
});
