import type { NextConfig } from "next";

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
};

export default nextConfig;
