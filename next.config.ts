import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['svg-captcha'],
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'api.dicebear.com' },
    ],
  },
};

export default nextConfig;
