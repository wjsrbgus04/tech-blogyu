import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import {
  PAGE_SIZE,
  TagArchivePage,
  tagArchiveMetadata,
  tagArchiveTotalPages,
} from '@/components/tagArchivePage'
import { api, cached } from '@/lib/apiClient'
import { decodeSegment, parsePageParam } from '@/lib/seo'

// Next 의 segment config 는 정적 리터럴만 인식한다 (apiClient 의 REVALIDATE_SECONDS 와 같은 값)
export const revalidate = 300

type Params = { name: string; n: string }

/** 범위 밖·잘못된 페이지 번호. 404 본문이 나가므로 색인 대상이 아니다. */
const NOT_A_PAGE: Metadata = { title: '찾는 글이 없습니다', robots: { index: false, follow: true } }

/**
 * 태그마다 2페이지부터 끝 페이지까지 미리 만든다. 이 함수가 없으면 Next 가
 * 이 라우트를 동적 렌더로 돌려 ISR 캐시가 붙지 않는다 — `/page/[n]` 과 같은 이유다.
 *
 * 글 수는 태그 목록이 이미 들고 있으므로 추가 호출이 없다.
 */
export async function generateStaticParams() {
  try {
    const res = await api.tags.$get(undefined, cached(['tags']))
    if (!res.ok) return []
    const { items } = await res.json()
    return items.flatMap((tag) => {
      const pages = Math.ceil(tag.count / PAGE_SIZE)
      return Array.from({ length: Math.max(0, pages - 1) }, (_, index) => ({
        name: tag.name,
        n: String(index + 2),
      }))
    })
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { name, n } = await params
  const decoded = decodeSegment(name)
  const page = parsePageParam(n)
  if (!decoded || !page) return NOT_A_PAGE

  // 본문이 404 를 낼 페이지가 목록인 척하는 제목·canonical 을 달고 나가지 않게,
  // 메타데이터도 같은 범위 검사를 거친다. `/page/[n]` 과 같은 규칙이다.
  const totalPages = await tagArchiveTotalPages(decoded, page)
  return totalPages !== null && page > totalPages ? NOT_A_PAGE : tagArchiveMetadata(decoded, page)
}

export default async function PagedTagPage({ params }: { params: Promise<Params> }) {
  const { name, n } = await params
  const decoded = decodeSegment(name)
  const page = parsePageParam(n)
  if (!decoded || !page) notFound()
  return <TagArchivePage name={decoded} page={page} />
}
