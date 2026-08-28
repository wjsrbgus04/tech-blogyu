import type { Metadata } from 'next'
import { PostList, type PostSummary } from '@/components/postList'
import { Shell } from '@/components/shell'
import { Sidebar } from '@/components/sidebar'
import { api, uncached } from '@/lib/apiClient'

// 검색 결과는 캐시하지 않는다 — 질의마다 다르고 크롤링 대상도 아니다
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '검색',
  robots: { index: false, follow: true },
}

type Search = { q?: string }

export default async function SearchPage({ searchParams }: { searchParams: Promise<Search> }) {
  const query = ((await searchParams).q ?? '').trim()

  let items: PostSummary[] = []
  let failed = false

  if (query) {
    try {
      const res = await api.search.$get({ query: { q: query } }, uncached)
      if (res.ok) items = (await res.json()).items as PostSummary[]
      else failed = true
    } catch {
      failed = true
    }
  }

  return (
    <Shell sidebar={<Sidebar />}>
      <h1 className="label mb-4 block">검색</h1>

      <search>
        <form className="mb-5 flex gap-2">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="제목·본문·태그 검색"
            aria-label="검색어"
            className="min-w-0 flex-1 rounded-md border border-border bg-bg-subtle px-4 py-2.5 text-base transition-colors focus:border-border-strong focus:bg-bg"
          />
        </form>
      </search>

      {query && (
        <p className="mb-6 text-[1.0625rem] text-fg-faint">
          <b className="font-[560] text-fg">{query}</b> — {items.length}건
        </p>
      )}

      {failed ? (
        <p className="py-16 text-center text-[1.1875rem] text-fg-faint">
          검색에 실패했습니다. 잠시 후 다시 시도해 주세요.
        </p>
      ) : query && items.length === 0 ? (
        <p className="py-16 text-center text-[1.1875rem] text-fg-faint">
          검색 결과가 없습니다. 다른 낱말로 찾아보세요.
        </p>
      ) : (
        <PostList items={items} />
      )}
    </Shell>
  )
}
