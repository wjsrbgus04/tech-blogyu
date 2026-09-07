import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { JsonLd } from '@/components/jsonLd'
import { Pagination } from '@/components/pagination'
import { PostGrid, PostHero, type PostSummary } from '@/components/postGrid'
import { Shell } from '@/components/shell'
import { api, cached } from '@/lib/apiClient'
import { websiteLd } from '@/lib/jsonLd'
import { pageHref, siteAlternates } from '@/lib/seo'

export const PAGE_SIZE = 10

/**
 * 페이지 번호는 경로(`/`, `/page/2`)로만 받는다. 쿼리로 받으면 목록 화면이
 * 동적 렌더로 바뀌어 ISR 캐시가 붙지 않고, 그러면 재검증 웹훅의
 * revalidatePath 가 비울 대상도 시간 만료도 없어 옛 목록이 영영 남는다.
 */
export function postListMetadata(page: number): Metadata {
  return {
    // 2페이지가 홈을 canonical 로 가리키면 거기 실린 글 목록이 홈에 귀속되어
    // 색인에서 사라진다. 페이지마다 자기 자신을 가리키게 한다.
    alternates: siteAlternates(pageHref('/', page)),
    // 목록 페이지가 전부 같은 제목이면 검색 결과에서 중복으로 접힌다
    ...(page > 1 ? { title: `${page}페이지` } : {}),
  }
}

/**
 * 목록을 가져온다. 실패하면 null 을 준다.
 *
 * 알려진 한계: 이 오류 화면은 200 이라 ISR 캐시에 적재된다(최대 300초, 다음 발행
 * 웹훅이 오면 즉시 해소). 예외를 던지면 캐시는 막히지만 API 장애 중 빌드가 통째로
 * 멈추고, `connection()` 은 ISR 재생성 경로에서 500 을 낸다 — 셋 다 실측했다.
 * 지금은 회복이 가장 빠른 쪽을 골라 두었다.
 */
export async function loadPostList(page: number) {
  try {
    const res = await api.posts.$get(
      { query: { page: String(page), limit: String(PAGE_SIZE) } },
      cached(['posts']),
    )
    if (res.ok) return await res.json()
  } catch {
    // 네트워크 실패 — 아래에서 오류 화면과 같은 취급을 한다
  }
  return null
}

/** 홈(1페이지)과 `/page/[n]` 이 함께 쓰는 글 목록 화면. */
export async function PostListPage({ page }: { page: number }) {
  const data = await loadPostList(page)

  if (!data) {
    return (
      <Shell>
        <p className="py-16 text-center text-body">
          글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
        </p>
      </Shell>
    )
  }

  /**
   * 범위 밖 페이지는 빈 목록이 아니라 404 다.
   * 그냥 두면 "아직 쓴 글이 없습니다"라는 거짓 안내가 나가고,
   * 검색엔진이 /page/999 같은 빈 페이지를 끝없이 색인한다.

   */
  if (page > 1 && page > data.totalPages) notFound()

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
