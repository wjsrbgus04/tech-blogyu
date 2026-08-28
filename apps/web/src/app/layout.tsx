import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { SITE_URL } from '@/lib/apiClient'
import { jetbrainsMono, pretendard } from '@/lib/fonts'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'blogyu',
    template: '%s · blogyu',
  },
  description: '엣지 런타임과 타입 안전한 API에 대해 씁니다. 대체로 실패한 이야기.',
  openGraph: {
    type: 'website',
    siteName: 'blogyu',
    locale: 'ko_KR',
  },
  alternates: {
    canonical: '/',
    types: {
      'application/rss+xml': [{ url: '/feed.xml', title: 'blogyu' }],
    },
  },
}

/**
 * 테마를 페인트 전에 확정한다. 이 스크립트가 없으면 저장된 테마가 다크인데도
 * 첫 프레임이 라이트로 그려져 화면이 번쩍인다.
 */
const themeInitScript = `
(function () {
  try {
    var saved = localStorage.getItem('blogyu-theme')
    var dark = saved ? saved === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.classList.toggle('dark', dark)
  } catch (e) {
    // 시크릿 모드 등에서 localStorage 접근이 막히면 시스템 설정을 따른다
  }
})()
`.trim()

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="ko"
      className={`${pretendard.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: FOUC 방지용 인라인 스크립트
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
