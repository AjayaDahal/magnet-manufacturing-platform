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
  // Firebase RTDB is used directly from client-side — no API proxy needed
};

module.exports = nextConfig;
