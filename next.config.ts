import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow leaflet to work (it uses browser-only APIs)
  transpilePackages: ["react-leaflet"],
};

export default nextConfig;
