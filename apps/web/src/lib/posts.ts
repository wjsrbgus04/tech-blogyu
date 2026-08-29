import type { InferResponseType } from 'hono/client'
import { api, cached, SITE_URL } from '@/lib/apiClient'
import { toIsoDate } from '@/lib/date'

type PostsResponse = InferResponseType<typeof api.posts.$get, 200>

/** 목록 응답의 글 한 건. 백엔드 라우터 타입에서 그대로 가져온다. */
export type PostListItem = PostsResponse['items'][number]

/** 상세 응답. 본문 마크다운이 들어 있다. */
export type PostDetail = InferResponseType<(typeof api.posts)[':slug']['$get'], 200>

/** 페이지당 요청 수. API 의 listQuerySchema 가 허용하는 최대치에 맞춘다. */
const PAGE_SIZE = 50

/**
 * 발행된 글 전체. 사이트맵·llms.txt 처럼 "빠짐없이" 가 목적인 곳에서 쓴다.
 *
 * API 가 중간에 죽으면 그때까지 모은 것만 돌려준다 — 사이트맵이 통째로
 * 비는 것보다 일부라도 남는 편이 낫다.
 */
export async function fetchAllPosts(maxPages = 20): Promise<PostListItem[]> {
  const collected: PostListItem[] = []

  try {
    let page = 1
    let totalPages = 1

    do {
      const res = await api.posts.$get(
        { query: { page: String(page), limit: String(PAGE_SIZE) } },
        cached(['posts']),
      )
      if (!res.ok) break

      const data = await res.json()
      totalPages = data.totalPages
      collected.push(...data.items)
      page += 1
    } while (page <= totalPages && page <= maxPages)
  } catch {
    // 네트워크 실패 — 모은 것까지만 쓴다
  }

  return collected
}

export async function fetchPostDetail(slug: string): Promise<PostDetail | null> {
  try {
    const res = await api.posts[':slug'].$get({ param: { slug } }, cached([`post:${slug}`]))
    return res.ok ? await res.json() : null
  } catch {
    return null
  }
}

/** YAML 큰따옴표 문자열. 제목에 콜론·따옴표가 들어가도 front matter 가 깨지지 않는다. */
function yamlString(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

/**
 * 글 한 편을 front matter 가 붙은 마크다운 문서로 만든다.
 *
 * 본문이 DB 에 마크다운으로 들어 있어서 렌더링 없이 그대로 나간다.
 * /posts/<slug>/index.md 와 /llms-full.txt 가 같은 함수를 쓴다 —
 * 두 곳의 형식이 갈라지지 않게 하려는 것이다.
 */
export function toPostMarkdown({ post, tags, series }: PostDetail): string {
  const frontMatter = [
    '---',
    `title: ${yamlString(post.title)}`,
    `description: ${yamlString(post.excerpt)}`,
    `url: ${SITE_URL}/posts/${post.slug}`,
    ...(post.publishedAt ? [`published: ${toIsoDate(post.publishedAt)}`] : []),
    ...(post.updatedAt ? [`updated: ${toIsoDate(post.updatedAt)}`] : []),
    ...(tags.length > 0 ? [`tags: [${tags.map(yamlString).join(', ')}]`] : []),
    ...(series ? [`series: ${yamlString(series.title)}`] : []),
    `reading_minutes: ${post.readingMinutes}`,
    '---',
  ].join('\n')

  // 본문이 이미 H1 으로 시작하면 제목을 덧붙이지 않는다. H1 이 둘이면
  // 읽는 쪽이 문서 두 개가 붙어 있는 것으로 본다.
  const body = /^\s*#\s/.test(post.content) ? post.content : `# ${post.title}\n\n${post.content}`

  return `${frontMatter}\n\n${body}\n`
}
