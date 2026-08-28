import { notFound } from 'next/navigation'
import { Pagination } from '@/components/pagination'
import { PostList, type PostSummary } from '@/components/postList'
import { Shell } from '@/components/shell'
import { Sidebar } from '@/components/sidebar'
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

  return (
    <Shell sidebar={<Sidebar />}>
      <div className="mb-1 flex items-baseline justify-between gap-4 border-border border-b pb-[1.1rem]">
        <h1 className="label">최근 글</h1>
        <a
          href="/feed.xml"
          className="text-[1rem] text-fg-faint transition-colors hover:text-accent-ink"
        >
          RSS 구독
        </a>
      </div>

      {data ? (
        <>
          <PostList items={data.items as PostSummary[]} startIndex={(page - 1) * PAGE_SIZE} />
          <Pagination page={data.page} totalPages={data.totalPages} />
        </>
      ) : (
        <p className="py-16 text-center text-[1.1875rem] text-fg-faint">
          글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
        </p>
      )}
    </Shell>
  )
}
