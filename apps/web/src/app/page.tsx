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

  return (
    <Shell sidebar={<Sidebar />}>
      <div className="mb-1 flex items-baseline justify-between gap-4 border-border border-b pb-[1.1rem]">
        <h1 className="label">최근 글</h1>
        <a
          href="/feed.xml"
          className="text-[0.75rem] text-fg-faint transition-colors hover:text-accent-ink"
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
        <p className="py-16 text-center text-[0.9375rem] text-fg-faint">
          글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
        </p>
      )}
    </Shell>
  )
}
