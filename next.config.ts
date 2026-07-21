import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // madden-franchise ships incorrect type definitions — suppress build-time type errors
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
