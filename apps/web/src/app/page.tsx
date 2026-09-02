import { notFound } from 'next/navigation'
import { Pagination } from '@/components/pagination'
import { PostGrid, PostHero, type PostSummary } from '@/components/postGrid'
import { Shell } from '@/components/shell'
import { api, cached } from '@/lib/apiClient'

// Next 의 segment config 는 정적 리터럴만 인식한다 (apiClient 의 REVALIDATE_SECONDS 와 같은 값)
export const revalidate = 300

const PAGE_SIZE = 10

type Search = { page?: string }

async function loadPosts(page: number) {
  try {
    const res = await api.posts.$get(
      { query: { page: String(page), limit: String(PAGE_SIZE) } },
      cached(['posts']),
    )
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export default async function HomePage({ searchParams }: { searchParams: Promise<Search> }) {
  const page = Math.max(1, Number((await searchParams).page ?? '1') || 1)
  const data = await loadPosts(page)
  /**
   * 범위 밖 페이지는 빈 목록이 아니라 404 다.
   * 그냥 두면 "아직 쓴 글이 없습니다"라는 거짓 안내가 나가고,
   * 검색엔진이 ?page=999 같은 빈 페이지를 끝없이 색인한다.
   */
  if (data && page > 1 && page > data.totalPages) notFound()

  if (!data) {
    return (
      <Shell>
        <p className="py-16 text-center text-body">
          글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
        </p>
      </Shell>
    )
  }

  const items = data.items as PostSummary[]
  // 첫 페이지의 가장 최근 글이 히어로다. 다음 페이지부터는 그리드만 이어진다.
  const [hero, ...rest] = page === 1 ? items : []
  const gridItems = page === 1 ? rest : items

  return (
    <Shell>
      <h1 className="sr-only">최근 글</h1>

      {hero && (
        <section className="mb-12">
          <PostHero post={hero} />
        </section>
      )}

      {(gridItems.length > 0 || !hero) && <PostGrid items={gridItems} />}

      <Pagination page={data.page} totalPages={data.totalPages} />
    </Shell>
  )
}
