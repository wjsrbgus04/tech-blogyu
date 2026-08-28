/**
 * OG 이미지 전용 색 상수.
 * satori 는 CSS 변수도 oklch 도 해석하지 못하므로 토큰 값을 sRGB 로 변환해 박아둔다.
 * tokens.css 의 다크 팔레트를 바꾸면 이 값도 같이 고쳐야 한다.
 */
export const OG = {
  bg: '#07080B',
  bgSubtle: '#0D0E11',
  fg: '#EDEEF1',
  fgMuted: '#999BA0',
  fgFaint: '#75787D',
  accent: '#BBEF39',
  border: '#232428',
} as const

export const OG_SIZE = { width: 1200, height: 630 } as const
