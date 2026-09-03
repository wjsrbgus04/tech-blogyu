import { api, cached, SITE_URL } from '@/lib/apiClient'
import type { PostListItem } from '@/lib/posts'
import { SITE_DESCRIPTION, SITE_NAME } from '@/lib/seo'

export const revalidate = 3600

/** XML 텍스트 노드에 그대로 넣을 수 없는 문자를 escape 한다. */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** RFC 822 표기. 값이 없거나 깨졌으면 null — 잘못된 날짜로 피드 전체를 깨뜨리지 않는다. */
function toRfc822(value: string | null | undefined): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toUTCString()
}

/**
 * 피드가 마지막으로 바뀐 시각. 가장 최근에 고치거나 발행한 글의 시각을 쓴다 —
 * 생성 시각을 쓰면 캐시가 갱신될 때마다 내용은 같은데 시각만 바뀐다.
 */
function lastBuildDate(items: PostListItem[]): string | null {
  const times = items
    .map((post) => new Date(post.updatedAt ?? post.publishedAt ?? '').getTime())
    .filter((time) => !Number.isNaN(time))
  return times.length > 0 ? new Date(Math.max(...times)).toUTCString() : null
}

export async function GET() {
  let items: PostListItem[] = []

  try {
    const res = await api.posts.$get({ query: { page: '1', limit: '30' } }, cached(['posts']))
    if (res.ok) items = (await res.json()).items
  } catch {
    // 빈 피드라도 유효한 XML 을 돌려준다
  }

  const built = lastBuildDate(items)

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_NAME)}</title>
    <link>${SITE_URL}</link>
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
    <language>ko</language>
    ${built ? `<lastBuildDate>${built}</lastBuildDate>` : ''}
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
${items
  .map((post) => {
    const pubDate = toRfc822(post.publishedAt)
    // 태그를 category 로 낸다 — 리더와 검색엔진이 글의 주제를 피드에서 바로 읽는다
    const categories = post.tags.map((tag) => `<category>${escapeXml(tag)}</category>`)
    return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${SITE_URL}/posts/${post.slug}</link>
      <guid isPermaLink="true">${SITE_URL}/posts/${post.slug}</guid>
      <description>${escapeXml(post.excerpt)}</description>
      ${[pubDate ? `<pubDate>${pubDate}</pubDate>` : '', ...categories].filter(Boolean).join('\n      ')}
    </item>`
  })
  .join('\n')}
  </channel>
</rss>`

  return new Response(body, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600',
    },
  })
}
