import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { JsonLd } from '@/components/jsonLd'
import { LoadError } from '@/components/loadError'
import { Pagination } from '@/components/pagination'
import { PostGrid, type PostSummary } from '@/components/postGrid'
import { Shell } from '@/components/shell'
import { api, cached } from '@/lib/apiClient'
import { breadcrumbLd, collectionPageLd } from '@/lib/jsonLd'
import { loadOrFail } from '@/lib/loadResult'
import { pageHref, siteAlternates } from '@/lib/seo'

export const PAGE_SIZE = 10

type Tag = { name: string; description: string | null; count: number }

function loadTag(name: string) {
  return loadOrFail<Tag>(() => api.tags[':name'].$get({ param: { name } }, cached(['tags'])))
}

/** 태그 설명이 없으면 글 수로 대신한다. 메타데이터와 화면이 같은 문장을 쓴다. */
function tagDescription(tag: Tag): string {
  return tag.description ?? `${tag.name} 태그가 붙은 글 ${tag.count}편.`
}

/**
 * 태그에 걸린 글 목록. 실패를 빈 목록으로 삼키지 않는다.
 *
 * 삼키면 totalPages 가 1 로 남아, 2페이지 이후 요청이 "장애" 가 아니라 "범위 밖" 으로
 * 오인되어 404 가 나간다. null 로 구분하고, 그 렌더는 캐시에 굽지 않는다.
 */
async function loadTagPosts(name: string, page: number) {
  try {
    const res = await api.posts.$get(
      { query: { tag: name, page: String(page), limit: String(PAGE_SIZE) } },
      cached(['posts']),
    )
    if (res.ok) return await res.json()
  } catch {
    // 네트워크 실패 — 아래에서 오류 화면과 같은 취급을 한다
  }
  return null
}

/**
 * 그 태그의 총 페이지 수. `generateMetadata` 가 본문과 같은 범위 검사를 하려고 쓴다.
 * 목록 fetch 캐시를 그대로 공유하므로 요청이 늘지 않는다.
 * 장애로 알 수 없으면 null — 그때는 범위를 단정하지 않는다.
 */
export async function tagArchiveTotalPages(name: string, page: number): Promise<number | null> {
  const data = await loadTagPosts(name, page)
  return data ? data.totalPages : null
}

/**
 * 페이지 번호는 경로(`/tags/x`, `/tags/x/page/2`)로만 받는다. 쿼리로 받으면
 * 이 화면이 동적 렌더로 바뀌어 ISR 캐시가 붙지 않고, 그러면 글을 발행해도
 * 재검증이 닿지 않아 옛 목록이 그대로 남는다.
 */
export async function tagArchiveMetadata(name: string, page: number): Promise<Metadata> {
  const result = await loadTag(name)
  // 없는 태그(404)와 API 장애 화면 둘 다 색인 대상이 아니다 — 루트 robots 를 물려받지 않게 덮어쓴다
  if (!result.ok)
    return { title: '태그를 찾을 수 없습니다', robots: { index: false, follow: true } }

  const tag = result.data
  const path = `/tags/${tag.name}`

  return {
    title: page > 1 ? `#${tag.name} · ${page}페이지` : `#${tag.name}`,
    // 태그마다 고유한 description 을 준다 — 검색 유입 경로가 되기 때문이다
    description: tagDescription(tag),
    alternates: siteAlternates(pageHref(path, page)),
  }
}

/** `/tags/[name]`(1페이지)과 `/tags/[name]/page/[n]` 이 함께 쓰는 태그 아카이브 화면. */
export async function TagArchivePage({ name, page }: { name: string; page: number }) {
  const result = await loadTag(name)
  // 태그가 없는 것과 API 가 죽은 것을 구분한다
  if (!result.ok && result.reason === 'notFound') notFound()
  if (!result.ok) {
    // loadOrFail 이 이미 이 렌더를 캐시 대상에서 뺐다
    return (
      <Shell>
        <LoadError label="태그" />
      </Shell>
    )
  }
  const tag = result.data

  const data = await loadTagPosts(name, page)
  if (!data) {
    return (
      <Shell>
        <LoadError label="태그" />
      </Shell>
    )
  }
  const posts = data.items as PostSummary[]

  // 범위 밖 페이지는 404 (홈과 같은 이유)
  if (page > 1 && page > data.totalPages) notFound()

  return (
    <Shell>
      <JsonLd
        data={[
          collectionPageLd({
            name: `#${tag.name}`,
            description: tagDescription(tag),
            path: `/tags/${tag.name}`,
            items: posts,
          }),
          breadcrumbLd([
            { name: '홈', path: '/' },
            { name: '태그', path: '/tags' },
            { name: `#${tag.name}`, path: `/tags/${tag.name}` },
          ]),
        ]}
      />

      <header className="mb-12">
        <h1 className="mb-4 text-display font-semibold">
          <span className="text-accent">#</span>
          {tag.name}
        </h1>
        <p className="max-w-[46ch] text-body-lg">{tagDescription(tag)}</p>
      </header>

      <PostGrid items={posts} />
      <Pagination page={page} totalPages={data.totalPages} basePath={`/tags/${tag.name}`} />
    </Shell>
  )
}
