import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { JsonLd } from '@/components/jsonLd'
import { Pagination } from '@/components/pagination'
import { PostGrid, PostHero, type PostSummary } from '@/components/postGrid'
import { Shell } from '@/components/shell'
import { api, cached } from '@/lib/apiClient'
import { websiteLd } from '@/lib/jsonLd'
import { siteAlternates } from '@/lib/seo'

// Next 의 segment config 는 정적 리터럴만 인식한다 (apiClient 의 REVALIDATE_SECONDS 와 같은 값)
export const revalidate = 300

const PAGE_SIZE = 10

type Search = { page?: string }

function pageParam(value: string | undefined): number {
  return Math.max(1, Number(value ?? '1') || 1)
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Search>
}): Promise<Metadata> {
  const page = pageParam((await searchParams).page)

  return {
    // 2페이지가 홈을 canonical 로 가리키면 거기 실린 글 목록이 홈에 귀속되어
    // 색인에서 사라진다. 페이지마다 자기 자신을 가리키게 한다.
    alternates: siteAlternates(page > 1 ? `/?page=${page}` : '/'),
    // 목록 페이지가 전부 같은 제목이면 검색 결과에서 중복으로 접힌다
    ...(page > 1 ? { title: `${page}페이지` } : {}),
  }
}

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
  const page = pageParam((await searchParams).page)
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
      {/* 검색 결과에 뜨는 사이트 이름을 이 구조화 데이터가 정한다 */}
      <JsonLd data={websiteLd()} />

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
