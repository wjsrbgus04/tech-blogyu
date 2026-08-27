import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { LoadError } from '@/components/loadError'
import { PostList, type PostSummary } from '@/components/postList'
import { Shell } from '@/components/shell'
import { Sidebar } from '@/components/sidebar'
import { api, cached } from '@/lib/apiClient'
import { loadOrFail } from '@/lib/loadResult'

// Next 의 segment config 는 정적 리터럴만 인식한다 (apiClient 의 REVALIDATE_SECONDS 와 같은 값)
export const revalidate = 300

type Params = { slug: string }

export async function generateStaticParams() {
  try {
    const res = await api.series.$get(undefined, cached(['series']))
    if (!res.ok) return []
    const { items } = await res.json()
    return items.map((item) => ({ slug: item.slug }))
  } catch {
    return []
  }
}

type Series = { slug: string; title: string; description: string | null; count: number }

function loadSeries(slug: string) {
  return loadOrFail<Series>(() => api.series[':slug'].$get({ param: { slug } }, cached(['series'])))
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params
  const result = await loadSeries(slug)
  if (!result.ok) return { title: '시리즈를 찾을 수 없습니다' }

  const series = result.data
  const description = series.description ?? `${series.title} 연재 ${series.count}편.`
  return {
    title: series.title,
    description,
    alternates: { canonical: `/series/${series.slug}` },
  }
}

export default async function SeriesPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params
  const result = await loadSeries(slug)
  if (!result.ok && result.reason === 'notFound') notFound()
  if (!result.ok) {
    return (
      <Shell sidebar={<Sidebar />}>
        <LoadError label="시리즈" />
      </Shell>
    )
  }
  const series = result.data

  let posts: PostSummary[] = []
  try {
    const res = await api.posts.$get({ query: { series: slug, limit: '50' } }, cached(['posts']))
    if (res.ok) posts = (await res.json()).items as PostSummary[]
  } catch {
    // 글을 못 불러와도 시리즈 헤더는 보여준다
  }

  return (
    <Shell sidebar={<Sidebar />}>
      <header className="mb-1 border-border border-b pb-6">
        <span className="label mb-2 block">시리즈</span>
        <h1 className="mb-2 font-[640] text-[clamp(1.5rem,3.4vw,2.125rem)] tracking-[-0.006em]">
          {series.title}
        </h1>
        <p className="max-w-[46ch] text-[0.875rem] text-fg-muted">
          {series.description ?? `연재 ${series.count}편.`}
        </p>
      </header>

      <PostList items={posts} />
    </Shell>
  )
}
