import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { JsonLd } from '@/components/jsonLd'
import { LoadError } from '@/components/loadError'
import { PostGrid, type PostSummary } from '@/components/postGrid'
import { Shell } from '@/components/shell'
import { api, cached } from '@/lib/apiClient'
import { breadcrumbLd, collectionPageLd } from '@/lib/jsonLd'
import { loadOrFail } from '@/lib/loadResult'
import { siteAlternates } from '@/lib/seo'

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
  // 없는 시리즈(404)와 API 장애 화면 둘 다 색인 대상이 아니다 — 루트 robots 를 물려받지 않게 덮어쓴다
  if (!result.ok)
    return { title: '시리즈를 찾을 수 없습니다', robots: { index: false, follow: true } }

  const series = result.data
  const description = series.description ?? `${series.title} 연재 ${series.count}편.`
  return {
    title: series.title,
    description,
    alternates: siteAlternates(`/series/${series.slug}`),
  }
}

export default async function SeriesPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params
  const result = await loadSeries(slug)
  if (!result.ok && result.reason === 'notFound') notFound()
  if (!result.ok) {
    return (
      <Shell>
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
    <Shell>
      <JsonLd
        data={[
          collectionPageLd({
            name: series.title,
            description: series.description ?? `${series.title} 연재 ${series.count}편.`,
            path: `/series/${series.slug}`,
            items: posts,
          }),
          breadcrumbLd([
            { name: '홈', path: '/' },
            { name: '시리즈', path: '/series' },
            { name: series.title, path: `/series/${series.slug}` },
          ]),
        ]}
      />

      <header className="mb-12">
        <span className="label mb-3 block">시리즈</span>
        <h1 className="mb-4 text-display font-semibold">{series.title}</h1>
        <p className="max-w-[46ch] text-body-lg">
          {series.description ?? `연재 ${series.count}편.`}
        </p>
      </header>

      <PostGrid items={posts} />
    </Shell>
  )
}
