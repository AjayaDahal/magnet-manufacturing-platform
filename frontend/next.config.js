/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath: "/magnet-manufacturing-platform",
  assetPrefix: "/magnet-manufacturing-platform/",
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      { protocol: "https", hostname: "**" },
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000",
  },
};

module.exports = nextConfig;
