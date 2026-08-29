import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { SITE_URL } from '@/lib/apiClient'
import { jetbrainsMono, pretendard } from '@/lib/fonts'
import { SITE_DESCRIPTION, SITE_LOCALE, SITE_NAME } from '@/lib/seo'
import './globals.css'

/** 서치 콘솔·서치어드바이저 소유 확인 값. 없으면 태그를 아예 내보내지 않는다. */
const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
const naverVerification = process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION

/**
 * alternates(canonical·RSS)를 여기 두지 않는다 — Next 의 메타데이터 병합이
 * 얕아서, alternates 를 정의하지 않은 하위 페이지가 루트의 canonical 을
 * 그대로 물려받는다. 페이지마다 lib/seo.ts 의 siteAlternates() 로 붙인다.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: SITE_LOCALE,
  },
  ...(googleVerification || naverVerification
    ? {
        verification: {
          ...(googleVerification ? { google: googleVerification } : {}),
          ...(naverVerification ? { other: { 'naver-site-verification': naverVerification } } : {}),
        },
      }
    : {}),
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
