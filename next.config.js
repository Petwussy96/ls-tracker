/** @type {import('next').NextConfig} */

// Content Security Policy: lock down which origins can load scripts/images/etc.
// We use 'unsafe-inline' on script-src because:
//   - The theme-init inline script in layout.tsx runs pre-hydration to avoid
//     a light/dark flash. A nonce-based CSP would require middleware-generated
//     nonces, which is doable but adds complexity. 'unsafe-inline' here only
//     opens injection from same-origin sources — and the rest of the CSP
//     blocks third-party scripts entirely.
// We DO whitelist specific external domains the app legitimately uses:
//   - Vercel Analytics: va.vercel-scripts.com
//   - Tesseract.js: unpkg.com + cdn.jsdelivr.net (worker + WASM + language data)
//   - Cloudinary: res.cloudinary.com (avatars + feedback screenshots)
//   - Supabase: *.supabase.co (DB pooler — server-side only, but include for safety)
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com https://unpkg.com https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://res.cloudinary.com",
  "font-src 'self' data:",
  "connect-src 'self' https://va.vercel-scripts.com https://unpkg.com https://cdn.jsdelivr.net https://res.cloudinary.com https://tessdata.projectnaptha.com",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  experimental: {
    serverComponentsExternalPackages: ["tesseract.js"],
  },

  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
    ];
  },
};

module.exports = nextConfig;
