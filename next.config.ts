import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    webVitalsAttribution: ["CLS", "FCP", "LCP", "FID", "TTFB", "INP"],
  },
};

export default nextConfig;
