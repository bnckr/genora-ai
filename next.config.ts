import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'gen.krea.ai' },
      { protocol: 'https', hostname: '**.krea.ai' },
    ],
  },
}

export default nextConfig
