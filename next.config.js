/** @type {import('next').NextConfig} */

// Security headers applied to every response. Conservative defaults — no CSP
// yet because Tesseract.js loads WASM from a CDN and Cloudinary serves
// avatars, so a strict CSP would need careful per-domain allowlisting.
// These headers cover the most common attack vectors (clickjacking,
// MIME-sniffing, leaky referrers, unwanted browser APIs).
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // HSTS — Vercel sets this on its anycast IP already, but doing it in-app
  // keeps the policy alive on any custom domain too.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // Tesseract.js loads its WASM at runtime from a CDN. Leaving it external
  // means Next.js doesn't try to bundle the .wasm into a serverless function.
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
