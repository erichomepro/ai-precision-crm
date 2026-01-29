import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Relax build checks for Vercel
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
