import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";
const turnstile = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

const scriptSrc = [
  "'self'",
  "'unsafe-inline'",
  isDev ? "'unsafe-eval'" : "",
  turnstile ? "https://challenges.cloudflare.com" : "",
]
  .filter(Boolean)
  .join(" ");

const connectSrc = [
  "'self'",
  "https://*.supabase.co",
  "wss://*.supabase.co",
  isDev ? "ws:" : "",
  isDev ? "wss:" : "",
  isDev ? "http://localhost:*" : "",
  isDev ? "http://127.0.0.1:*" : "",
  turnstile ? "https://challenges.cloudflare.com" : "",
]
  .filter(Boolean)
  .join(" ");

const csp = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https:",
  "font-src 'self'",
  `connect-src ${connectSrc}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  `frame-src ${turnstile ? "https://challenges.cloudflare.com" : "'none'"}`,
  "worker-src 'self'",
  "manifest-src 'self'",
  isDev ? "" : "upgrade-insecure-requests",
]
  .filter(Boolean)
  .join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Origin-Agent-Cluster", value: "?1" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  ...(isDev
    ? []
    : [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
    proxyClientMaxBodySize: "5mb",
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
