import { ImageResponse } from 'next/og'
import { loadOgFont } from '@/lib/ogFont'
import { OG, OG_SIZE } from '@/lib/ogTheme'

export const alt = 'blogyu'
export const size = OG_SIZE
export const contentType = 'image/png'

/** 사이트 공통 OG 이미지. 글이 아닌 페이지(홈·태그·검색)가 쓴다. */
export default async function Image() {
  const font = await loadOgFont()

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        background: OG.bg,
        padding: 80,
        fontFamily: 'Pretendard',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 20, height: 20, borderRadius: 999, background: OG.accent }} />
        <div style={{ fontSize: 64, color: OG.fg, letterSpacing: -2 }}>blogyu</div>
      </div>
      <div style={{ marginTop: 24, fontSize: 32, color: OG.fgMuted, lineHeight: 1.5 }}>
        엣지 런타임과 타입 안전한 API에 대해 씁니다.
      </div>
    </div>,
    { ...size, fonts: [{ name: 'Pretendard', data: font, weight: 700, style: 'normal' }] },
  )
}
