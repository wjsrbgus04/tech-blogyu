/**
 * OG 이미지 전용 색 상수.
 * satori 는 CSS 변수를 해석하지 못하므로 docs/design/tokens.json 의 값을 hex 로 박아둔다.
 * 팔레트를 바꾸면 이 값도 같이 고쳐야 한다.
 */
export const OG = {
  bg: '#ffffff',
  fg: '#000000',
  fgMuted: '#4a4a4a',
  accent: '#ff00bc',
  border: '#e4e4e4',
} as const

export const OG_SIZE = { width: 1200, height: 630 } as const
