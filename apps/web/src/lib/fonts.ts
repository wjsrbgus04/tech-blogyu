import localFont from 'next/font/local'

/**
 * 폰트는 self-host 한다.
 * - next/font/google 은 Turbopack 빌드에서 한글 subset 다운로드가 깨진다
 * - CDN 링크는 외부 의존성이자 레이아웃 시프트 요인이다
 */
export const pretendard = localFont({
  src: '../fonts/PretendardVariable.woff2',
  variable: '--font-pretendard',
  weight: '45 920',
  display: 'swap',
  // 한글 폴백과 크기를 맞춰 폰트 로드 전후 시프트를 줄인다
  adjustFontFallback: false,
  fallback: [
    '-apple-system',
    'BlinkMacSystemFont',
    'Apple SD Gothic Neo',
    'Segoe UI',
    'system-ui',
    'sans-serif',
  ],
})

export const jetbrainsMono = localFont({
  src: '../fonts/JetBrainsMono.woff2',
  variable: '--font-jetbrains',
  weight: '100 800',
  display: 'swap',
  adjustFontFallback: false,
  fallback: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
})
