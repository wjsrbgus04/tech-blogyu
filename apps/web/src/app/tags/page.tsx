import type { Metadata } from 'next'
import Link from 'next/link'
import { JsonLd } from '@/components/jsonLd'
import { Shell } from '@/components/shell'
import { Sidebar } from '@/components/sidebar'
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
    <Shell sidebar={<Sidebar />}>
      <JsonLd
        data={breadcrumbLd([
          { name: '홈', path: '/' },
          { name: '태그', path: '/tags' },
        ])}
      />

      <h1 className="label mb-4 block">전체 태그</h1>
      <div className="flex flex-wrap gap-1.5">
        {items.map((tag) => (
          <Link
            key={tag.name}
            href={`/tags/${tag.name}`}
            className="inline-flex items-baseline gap-1.5 rounded-sm border border-border px-2.5 py-1.5 text-[0.875rem] text-fg-muted transition-colors hover:border-border-strong hover:text-fg"
          >
            {tag.name}
            <span className="tabular text-[0.75rem] opacity-55">{tag.count}</span>
          </Link>
        ))}
      </div>
    </Shell>
  )
}
