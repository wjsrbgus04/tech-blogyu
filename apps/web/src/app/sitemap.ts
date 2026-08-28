import type { MetadataRoute } from 'next'
import { api, cached, SITE_URL } from '@/lib/apiClient'

export const revalidate = 3600

/** 사이트맵은 발행된 글 전체를 담는다. 페이지네이션으로 끝까지 훑는다. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/tags`, changeFrequency: 'weekly', priority: 0.5 },
  ]

  try {
    let page = 1
    let totalPages = 1

    do {
      const res = await api.posts.$get(
        { query: { page: String(page), limit: '50' } },
        cached(['posts']),
      )
      if (!res.ok) break

      const data = await res.json()
      totalPages = data.totalPages

      for (const post of data.items) {
        entries.push({
          url: `${SITE_URL}/posts/${post.slug}`,
          lastModified: post.publishedAt ? new Date(post.publishedAt) : undefined,
          changeFrequency: 'monthly',
          priority: 0.8,
        })
      }
      page += 1
    } while (page <= totalPages)

    const tagsRes = await api.tags.$get(undefined, cached(['tags']))
    if (tagsRes.ok) {
      for (const tag of (await tagsRes.json()).items) {
        entries.push({
          url: `${SITE_URL}/tags/${tag.name}`,
          changeFrequency: 'weekly',
          priority: 0.4,
        })
      }
    }
  } catch {
    // API 가 죽어도 최소한 홈은 사이트맵에 남는다
  }

  return entries
}
