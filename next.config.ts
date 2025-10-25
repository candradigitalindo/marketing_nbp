import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    instrumentationHook: true,
  },
  
  // Production optimizations
  compress: true,
  poweredByHeader: false,
  
  // Enable standalone output for Docker
  output: process.env.DOCKER_BUILD === 'true' ? 'standalone' : undefined,
  
  // Image optimization
  images: {
    domains: ['localhost'],
    unoptimized: false,
  },
  
  // Logging in production
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};

export default nextConfig;
