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
  title: '태그',
  description: '주제별로 모아 본 글 목록.',
  alternates: siteAlternates('/tags'),
}

export default async function TagsPage() {
  let items: { name: string; count: number }[] = []
  try {
    const res = await api.tags.$get(undefined, cached(['tags']))
    if (res.ok) items = (await res.json()).items
  } catch {
    // 목록이 비어도 페이지는 뜬다
  }

  return (
    <Shell>
      <JsonLd
        data={breadcrumbLd([
          { name: '홈', path: '/' },
          { name: '태그', path: '/tags' },
        ])}
      />

      <h1 className="mb-8 text-display font-semibold">전체 태그</h1>
      {items.length === 0 ? (
        <p className="py-16 text-center text-body">아직 태그가 없습니다.</p>
      ) : (
        <ul className="flex flex-wrap gap-x-6 gap-y-4 text-body-lg">
          {items.map((tag) => (
            <li key={tag.name} className="inline-flex items-baseline gap-1.5">
              <Link href={`/tags/${tag.name}`} className="ink-link">
                {tag.name}
              </Link>
              <span className="tabular text-caption text-fg-faint">{tag.count}</span>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  )
}
