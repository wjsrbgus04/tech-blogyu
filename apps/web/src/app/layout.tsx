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
  /**
   * 미리보기 크기 상한을 푼다. 기본값은 이미지를 작게, 스니펫을 짧게 자르므로
   * Google Discover 와 리치 결과에 큰 이미지·긴 발췌가 실리지 않는다.
   *
   * index·follow 는 적지 않는다 — Next 가 404 응답에 noindex 메타를 따로 심는데,
   * 여기서 index 를 선언하면 한 문서에 상반된 robots 메타가 둘 생긴다.
   */
  robots: {
    'max-image-preview': 'large',
    'max-snippet': -1,
    'max-video-preview': -1,
  },
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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" className={`${pretendard.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
