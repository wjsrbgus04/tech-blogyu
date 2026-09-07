import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { loadPostList, PAGE_SIZE, PostListPage, postListMetadata } from '@/components/postListPage'
import { api, cached } from '@/lib/apiClient'
import { parsePageParam } from '@/lib/seo'

// Next 의 segment config 는 정적 리터럴만 인식한다 (apiClient 의 REVALIDATE_SECONDS 와 같은 값)
export const revalidate = 300

type Params = { n: string }

/** 범위 밖·잘못된 페이지 번호. 404 본문이 나가므로 색인 대상이 아니다. */
const NOT_A_PAGE: Metadata = { title: '찾는 글이 없습니다', robots: { index: false, follow: true } }

/**
 * 2페이지부터 끝 페이지까지 미리 만든다. 이 함수가 없으면 Next 가 이 라우트를
 * 동적 렌더로 돌려서 ISR 캐시가 붙지 않고, 그러면 홈이 겪던 문제
 * (재검증도 시간 만료도 닿지 않아 옛 목록이 남는 것)를 2페이지가 그대로 물려받는다.
 *
 * 빌드 중 API 가 닫혀 있으면 빈 배열을 돌려 전부 요청 시 생성으로 넘어간다.
 */
export async function generateStaticParams() {
  try {
    const res = await api.posts.$get(
      { query: { page: '1', limit: String(PAGE_SIZE) } },
      cached(['posts']),
    )
    if (!res.ok) return []
    const { totalPages } = await res.json()
    // 1페이지는 홈이 맡는다
    return Array.from({ length: Math.max(0, totalPages - 1) }, (_, index) => ({
      n: String(index + 2),
    }))
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const page = parsePageParam((await params).n)
  if (!page) return NOT_A_PAGE

  // 본문이 404 를 낼 페이지가 목록인 척하는 제목·canonical 을 달고 나가지 않게,
  // 메타데이터도 같은 범위 검사를 거친다. 목록 fetch 는 캐시를 공유한다.
  // 장애로 알 수 없으면 범위를 단정하지 않는다.
  const data = await loadPostList(page)
  return data && page > data.totalPages ? NOT_A_PAGE : postListMetadata(page)
}

export default async function PagedHomePage({ params }: { params: Promise<Params> }) {
  const page = parsePageParam((await params).n)
  if (!page) notFound()
  return <PostListPage page={page} />
}
