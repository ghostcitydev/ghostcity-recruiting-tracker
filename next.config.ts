import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Keep these unbundled: they read data files relative to import.meta.url/__dirname
  // at runtime, which breaks once Turbopack bundles that code into a chunk.
  serverExternalPackages: ['madden-franchise', 'better-sqlite3'],
  outputFileTracingIncludes: {
    '/api/cloud/process': [
      './lib/embeddedMods/fang/**',
      './lib/embeddedMods/pocketScout/**',
      './lib/embeddedMods/pipeline/**',
      './public/other mods/redistribution.js',
    ],
  },
  typescript: {
    // madden-franchise ships incorrect type definitions — suppress build-time type errors
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
