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

  /**
   * 글 주소의 마크다운 협상. AI 에이전트가 `Accept: text/markdown` 으로 글 주소를
   * 요청하면 HTML 대신 마크다운 원문(index.md)을 그대로 준다. 주소는 하나로 두고
   * 표현만 바꾸는 것이라 rewrite 다 — redirect 로 주소를 바꾸면 인용 링크가
   * index.md 로 굳는다.
   *
   * proxy.ts 로 하지 않는 이유: Node 런타임 proxy 가 있으면 OpenNext 가 미들웨어
   * 번들에 Turbopack 런타임을 싣고, 거기에 @vercel/og 를 끼워 넣는 패치를 해서
   * 워커가 gzip 기준 300KiB 넘게 커진다(무료 플랜 한도 3MiB). 설정 rewrite 는
   * 라우팅 계층이 처리하므로 그 비용이 없다.
   *
   * 조건은 "Accept 에 text/markdown 이 들어 있다" 뿐이다. q 가중치까지 따지지는
   * 않는다 — 브라우저는 text/markdown 을 보내지 않으므로 실제로는 충분하다.
   * Next 는 값을 ^…$ 로 감싸고 OpenNext 는 감싸지 않으므로 양쪽에서 같게 읽히는
   * 형태(앞뒤에 .* 를 붙인 부분 일치)로 쓴다.
   */
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/posts/:slug',
          has: [{ type: 'header', key: 'accept', value: '.*text/markdown.*' }],
          destination: '/posts/:slug/index.md',
        },
      ],
    }
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
      {
        // 위 rewrite 로 같은 주소가 Accept 에 따라 다른 표현을 낸다. 중간 캐시가
        // 이걸 모르면 에이전트가 받은 마크다운을 다음 브라우저에 그대로 돌려준다.
        source: '/posts/:slug',
        headers: [{ key: 'Vary', value: 'Accept' }],
      },
    ]
  },
}

export default nextConfig
