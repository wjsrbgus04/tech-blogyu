import { ImageResponse } from 'next/og'
import { api, cached } from '@/lib/apiClient'
import { formatDate } from '@/lib/date'
import { loadOgFont } from '@/lib/ogFont'
import { OG, OG_SIZE } from '@/lib/ogTheme'

export const alt = 'blogyu 글'
export const size = OG_SIZE
export const contentType = 'image/png'

/**
 * 글별 OG 이미지. 어드민에서 커버를 올리지 않은 글은 이 이미지가 대신 쓰인다.
 * 글마다 커버를 만드는 부담을 없애는 게 목적이다.
 */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const font = await loadOgFont()

  let title = 'blogyu'
  let tags: string[] = []
  let meta = ''

  try {
    const res = await api.posts[':slug'].$get({ param: { slug } }, cached([`post:${slug}`]))
    if (res.ok) {
      const data = await res.json()
      title = data.post.title
      tags = data.tags.slice(0, 4)
      meta = `${formatDate(data.post.publishedAt)} · ${data.post.readingMinutes}분`
    }
  } catch {
    // 이미지 생성이 글 페이지를 막으면 안 된다 — 기본값으로 그린다
  }

  // 제목이 길면 글자 크기를 줄여 3줄 안에 들어오게 한다
  const titleSize = title.length > 42 ? 56 : title.length > 26 ? 68 : 80

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: OG.bg,
        padding: 72,
        fontFamily: 'Pretendard',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 16, height: 16, borderRadius: 999, background: OG.accent }} />
        <div style={{ fontSize: 30, color: OG.fgMuted, letterSpacing: -0.5 }}>blogyu</div>
      </div>

      <div
        style={{
          display: 'flex',
          flex: 1,
          alignItems: 'center',
          fontSize: titleSize,
          lineHeight: 1.28,
          letterSpacing: -1.5,
          color: OG.fg,
        }}
      >
        {title}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {tags.map((tag) => (
          <div
            key={tag}
            style={{
              display: 'flex',
              fontSize: 24,
              color: OG.fgFaint,
              border: `1px solid ${OG.border}`,
              borderRadius: 8,
              padding: '6px 16px',
            }}
          >
            {tag}
          </div>
        ))}
        {meta && (
          <div style={{ display: 'flex', marginLeft: 'auto', fontSize: 24, color: OG.fgFaint }}>
            {meta}
          </div>
        )}
      </div>
    </div>,
    { ...size, fonts: [{ name: 'Pretendard', data: font, weight: 700, style: 'normal' }] },
  )
}
