import { api, cached, SITE_URL } from '@/lib/apiClient'

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

export async function GET() {
  let items: { slug: string; title: string; excerpt: string; publishedAt: string | null }[] = []

  try {
    const res = await api.posts.$get({ query: { page: '1', limit: '30' } }, cached(['posts']))
    if (res.ok) items = (await res.json()).items
  } catch {
    // 빈 피드라도 유효한 XML 을 돌려준다
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>blogyu</title>
    <link>${SITE_URL}</link>
    <description>엣지 런타임과 타입 안전한 API에 대해 씁니다.</description>
    <language>ko</language>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
${items
  .map(
    (post) => `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${SITE_URL}/posts/${post.slug}</link>
      <guid isPermaLink="true">${SITE_URL}/posts/${post.slug}</guid>
      <description>${escapeXml(post.excerpt)}</description>
      ${post.publishedAt ? `<pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>` : ''}
    </item>`,
  )
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
