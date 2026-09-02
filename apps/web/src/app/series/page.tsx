import type { Metadata } from 'next'
import Link from 'next/link'
import { JsonLd } from '@/components/jsonLd'
import { Shell } from '@/components/shell'
import { api, cached } from '@/lib/apiClient'
import { breadcrumbLd } from '@/lib/jsonLd'
import { siteAlternates } from '@/lib/seo'

// Next 의 segment config 는 정적 리터럴만 인식한다 (apiClient 의 REVALIDATE_SECONDS 와 같은 값)
export const revalidate = 300

export const metadata: Metadata = {
  title: '시리즈',
  description: '여러 편으로 이어 쓴 글 묶음.',
  alternates: siteAlternates('/series'),
}

export default async function SeriesIndexPage() {
  let items: { slug: string; title: string; count: number }[] = []
  try {
    const res = await api.series.$get(undefined, cached(['series']))
    if (res.ok) items = (await res.json()).items
  } catch {
    // 목록이 비어도 페이지는 뜬다
  }

  return (
    <Shell>
      <JsonLd
        data={breadcrumbLd([
          { name: '홈', path: '/' },
          { name: '시리즈', path: '/series' },
        ])}
      />

      <h1 className="mb-8 text-display font-semibold">전체 시리즈</h1>

      {items.length === 0 ? (
        <p className="py-16 text-center text-body">아직 시리즈가 없습니다.</p>
      ) : (
        <ul className="flex flex-col gap-4 text-body-lg">
          {items.map((item) => (
            <li key={item.slug} className="flex items-baseline gap-3">
              <Link href={`/series/${item.slug}`} className="ink-link">
                {item.title}
              </Link>
              <span className="tabular text-caption text-fg-faint">{item.count}편</span>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  )
}
