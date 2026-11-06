import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every screen is live chain data; nothing here benefits from prerender caching.
  cacheComponents: false,
  reactStrictMode: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
