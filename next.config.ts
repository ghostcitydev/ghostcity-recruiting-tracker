import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  typescript: {
    // madden-franchise ships incorrect type definitions — suppress build-time type errors
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
