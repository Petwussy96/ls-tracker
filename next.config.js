/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Tesseract.js loads its WASM and language data at runtime; don't let
  // Next.js try to bundle those — leave it as an external module.
  experimental: {
    serverComponentsExternalPackages: ["tesseract.js"],
  },
};

module.exports = nextConfig;
