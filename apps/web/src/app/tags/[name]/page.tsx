import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { JsonLd } from '@/components/jsonLd'
import { LoadError } from '@/components/loadError'
import { Pagination } from '@/components/pagination'
import { PostList, type PostSummary } from '@/components/postList'
import { Shell } from '@/components/shell'
import { Sidebar } from '@/components/sidebar'
import { api, cached } from '@/lib/apiClient'
import { breadcrumbLd, collectionPageLd } from '@/lib/jsonLd'
import { loadOrFail } from '@/lib/loadResult'
import { siteAlternates } from '@/lib/seo'

// Next 의 segment config 는 정적 리터럴만 인식한다 (apiClient 의 REVALIDATE_SECONDS 와 같은 값)
export const revalidate = 300

const PAGE_SIZE = 10

type Params = { name: string }

export async function generateStaticParams() {
  try {
    const res = await api.tags.$get(undefined, cached(['tags']))
    if (!res.ok) return []
    const { items } = await res.json()
    return items.map((tag) => ({ name: tag.name }))
  } catch {
    return []
  }
}
type Search = { page?: string }

type Tag = { name: string; description: string | null; count: number }

function loadTag(name: string) {
  return loadOrFail<Tag>(() => api.tags[':name'].$get({ param: { name } }, cached(['tags'])))
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<Params>
  searchParams: Promise<Search>
}): Promise<Metadata> {
  const { name } = await params
  const page = Math.max(1, Number((await searchParams).page ?? '1') || 1)
  const result = await loadTag(decodeURIComponent(name))
  if (!result.ok) return { title: '태그를 찾을 수 없습니다' }

  const tag = result.data
  // 태그마다 고유한 description 을 준다 — 검색 유입 경로가 되기 때문이다
  const description = tag.description ?? `${tag.name} 태그가 붙은 글 ${tag.count}편.`
  const path = `/tags/${tag.name}`

  return {
    title: page > 1 ? `#${tag.name} · ${page}페이지` : `#${tag.name}`,
    description,
    alternates: siteAlternates(page > 1 ? `${path}?page=${page}` : path),
  }
}

export default async function TagArchivePage({
  params,
  searchParams,
}: {
  params: Promise<Params>
  searchParams: Promise<Search>
}) {
  const name = decodeURIComponent((await params).name)
  const page = Math.max(1, Number((await searchParams).page ?? '1') || 1)

  const result = await loadTag(name)
  // 태그가 없는 것과 API 가 죽은 것을 구분한다
  if (!result.ok && result.reason === 'notFound') notFound()
  if (!result.ok) {
    return (
      <Shell sidebar={<Sidebar />}>
        <LoadError label="태그" />
      </Shell>
    )
  }
  const tag = result.data

  let posts: PostSummary[] = []
  let totalPages = 1
  try {
    const res = await api.posts.$get(
      { query: { tag: name, page: String(page), limit: String(PAGE_SIZE) } },
      cached(['posts']),
    )
    if (res.ok) {
      const data = await res.json()
      posts = data.items as PostSummary[]
      totalPages = data.totalPages
    }
  } catch {
    // 글을 못 불러와도 태그 헤더는 보여준다
  }

  // 범위 밖 페이지는 404 (홈과 같은 이유)
  if (page > 1 && page > totalPages) notFound()

  return (
    <Shell sidebar={<Sidebar />}>
      <JsonLd
        data={[
          collectionPageLd({
            name: `#${tag.name}`,
            description: tag.description ?? `${tag.name} 태그가 붙은 글 ${tag.count}편.`,
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

      <header className="mb-1 border-border border-b pb-6">
        <h1 className="mb-2 font-[620] text-[clamp(1.75rem,4vw,2.5rem)] tracking-[-0.022em]">
          <span className="text-accent">#</span>
          {tag.name}
        </h1>
        <p className="max-w-[46ch] text-[0.875rem] text-fg-muted">
          {tag.description ?? `${tag.name} 태그가 붙은 글 ${tag.count}편.`}
        </p>
      </header>

      <PostList items={posts} startIndex={(page - 1) * PAGE_SIZE} />
      <Pagination page={page} totalPages={totalPages} basePath={`/tags/${tag.name}`} />
    </Shell>
  )
}
