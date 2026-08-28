import type { NextConfig } from 'next'

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787'

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // @blogyu/api 는 타입만 import 하므로 런타임 번들에 들어가지 않는다.

  /**
   * shiki 는 Next 기본 serverExternalPackages 목록에 들어 있다(server-external-packages.jsonc).
   * external 로 두면 번들러가 손대지 않아 언어 문법 261개 + 테마 65개가 통째로 딸려오고,
   * 그것만으로 Workers 무료 플랜의 3MiB(gzip) 한도를 넘긴다.
   * transpilePackages 에 넣으면 external 목록에서 빠져(webpack-config.js 의 optOutBundlingPackages)
   * 실제로 import 한 언어만 남는다. markdown.ts 의 언어 목록과 짝이다.
   */
  transpilePackages: ['shiki'],

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
