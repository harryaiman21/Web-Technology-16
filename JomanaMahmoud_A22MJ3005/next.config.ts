import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Add this line to whitelist your IP
  allowedDevOrigins: ['172.20.10.5', '192.168.1.116'],
};

export default nextConfig;
