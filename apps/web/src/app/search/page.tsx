import type { Metadata } from 'next'
import { PostGrid, type PostSummary } from '@/components/postGrid'
import { Shell } from '@/components/shell'
import { api, uncached } from '@/lib/apiClient'
import { siteAlternates } from '@/lib/seo'

// 검색 결과는 캐시하지 않는다 — 질의마다 다르고 크롤링 대상도 아니다
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '검색',
  robots: { index: false, follow: true },
  // noindex 라도 canonical 은 자기 자신을 가리켜야 한다 — 안 그러면 홈을 물려받는다
  alternates: siteAlternates('/search'),
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
    <Shell>
      <h1 className="mb-6 text-display font-semibold">검색</h1>

      <search>
        <form className="mb-12">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="제목·본문·태그 검색"
            aria-label="검색어"
            // biome-ignore lint/a11y/noAutofocus: 검색 화면의 유일한 입력이라 바로 타이핑할 수 있어야 한다
            autoFocus
            className="w-full max-w-[40rem] border border-input-border bg-bg px-4 py-3 text-body-lg placeholder:text-fg-faint"
          />
        </form>
      </search>

      {query && (
        <p className="mb-8 text-caption">
          <b className="font-semibold">{query}</b> — {items.length}건
        </p>
      )}

      {failed ? (
        <p className="py-16 text-center text-body">
          검색에 실패했습니다. 잠시 후 다시 시도해 주세요.
        </p>
      ) : query && items.length === 0 ? (
        <p className="py-16 text-center text-body">검색 결과가 없습니다. 다른 낱말로 찾아보세요.</p>
      ) : query ? (
        <PostGrid items={items} />
      ) : null}
    </Shell>
  )
}
