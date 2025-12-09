import type { NextConfig } from "next";

// Bundle analyzer for performance monitoring
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  experimental: {
    webVitalsAttribution: ["CLS", "FCP", "LCP", "FID", "TTFB", "INP"],
    // Note: cacheComponents requires Next.js canary version
    // When upgrading to canary, enable: cacheComponents: true
  },
  // Optimize images
  images: {
    formats: ["image/avif", "image/webp"],
  },
  // Bundle optimization
  webpack: (config, { dev, isServer }) => {
    // Optimize bundle in production
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: "all",
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: "vendor",
            chunks: "all",
            priority: 10,
          },
          common: {
            name: "common",
            minChunks: 2,
            chunks: "all",
            priority: 5,
          },
        },
      };
    }
    return config;
  },
};

export default withBundleAnalyzer(nextConfig);
