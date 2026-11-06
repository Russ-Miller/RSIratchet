import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Adages renamed to Heuristics; old links keep working.
      { source: "/adages", destination: "/heuristics", permanent: true },
      { source: "/adages/:id", destination: "/heuristics/:id", permanent: true },
    ];
  },
};

export default nextConfig;
