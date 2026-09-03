import type { MetadataRoute } from 'next'
import { api, cached, SITE_URL } from '@/lib/apiClient'
import { fetchAllPosts, type PostListItem } from '@/lib/posts'

export const revalidate = 3600

/**
 * lastmod 로 쓸 시각. 고친 시각이 우선이다 — 발행일만 쓰면 글을 고쳐도
 * 재크롤 신호가 안 간다.
 *
 * updatedAt 이 없을 수 있다: api 배포가 web 보다 늦으면 목록 응답에 아직
 * 그 필드가 없다. 값이 하나도 없으면 lastmod 없이 내보낸다 — 잘못된 날짜로
 * 사이트맵 전체를 깨뜨리는 것보다 낫다.
 */
function lastModified(post: PostListItem): Date | undefined {
  const value = post.updatedAt ?? post.publishedAt
  if (!value) return undefined

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

/** 사이트맵은 발행된 글 전체와 아카이브 페이지를 담는다. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/tags`, changeFrequency: 'weekly', priority: 0.5 },
    { url: `${SITE_URL}/series`, changeFrequency: 'weekly', priority: 0.5 },
  ]

  for (const post of await fetchAllPosts()) {
    entries.push({
      url: `${SITE_URL}/posts/${post.slug}`,
      lastModified: lastModified(post),
      changeFrequency: 'monthly',
      priority: 0.8,
    })
  }

  try {
    const [tagsRes, seriesRes] = await Promise.all([
      api.tags.$get(undefined, cached(['tags'])),
      api.series.$get(undefined, cached(['series'])),
    ])

    if (tagsRes.ok) {
      for (const tag of (await tagsRes.json()).items) {
        entries.push({
          // 한글 태그가 그대로 들어가면 <loc> 가 사이트맵 스펙에 어긋난다.
          // canonical 과 같은 방식(new URL)으로 인코딩한다 — encodeURIComponent 는
          // + 같은 문자를 다르게 바꿔 사이트맵 주소가 canonical 과 어긋난다.
          url: new URL(`/tags/${tag.name}`, SITE_URL).href,
          changeFrequency: 'weekly',
          priority: 0.4,
        })
      }
    }

    if (seriesRes.ok) {
      for (const item of (await seriesRes.json()).items) {
        entries.push({
          // 태그와 같은 이유로 canonical 과 같은 방식(new URL)으로 인코딩한다
          url: new URL(`/series/${item.slug}`, SITE_URL).href,
          changeFrequency: 'weekly',
          priority: 0.6,
        })
      }
    }
  } catch {
    // API 가 죽어도 글 목록까지는 사이트맵에 남는다
  }

  return entries
}
