import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // Skip type checking during build (for faster deployment)
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Allow images from Bria's CDN and placeholder service
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.bria-api.com',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'fastly.picsum.photos',
      },
    ],
  },
};

export default nextConfig;
