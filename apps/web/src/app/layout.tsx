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
  description: '직접 경험한 것과 해결해본 것에 대해 씁니다. 대체로 실패한 이야기.',
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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" className={`${pretendard.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
