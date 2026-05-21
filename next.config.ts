import type { NextConfig } from "next";

// next.config.ts
const nextConfig: NextConfig = {
  // ↓ 이 블록을 추가합니다
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
      },
    ],
  },
}

export default nextConfig;
