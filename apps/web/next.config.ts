import type { NextConfig } from 'next'

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787'

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // @blogyu/api 는 타입만 import 하므로 런타임 번들에 들어가지 않는다.

  images: {
    remotePatterns: [
      // R2 이미지. 커스텀 도메인을 붙이면 여기에 추가한다.
      { protocol: 'https', hostname: '**.workers.dev' },
      { protocol: 'https', hostname: '**.r2.dev' },
      ...(apiUrl.startsWith('http://localhost')
        ? [{ protocol: 'http' as const, hostname: 'localhost' }]
        : []),
    ],
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
    ]
  },
}

export default nextConfig
