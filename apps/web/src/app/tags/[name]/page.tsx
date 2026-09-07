import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { TagArchivePage, tagArchiveMetadata } from '@/components/tagArchivePage'
import { api, cached } from '@/lib/apiClient'
import { decodeSegment } from '@/lib/seo'

// Next 의 segment config 는 정적 리터럴만 인식한다 (apiClient 의 REVALIDATE_SECONDS 와 같은 값)
export const revalidate = 300

type Params = { name: string }

export async function generateStaticParams() {
  try {
    const res = await api.tags.$get(undefined, cached(['tags']))
    if (!res.ok) return []
    const { items } = await res.json()
    return items.map((tag) => ({ name: tag.name }))
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const name = decodeSegment((await params).name)
  if (!name) return { title: '태그를 찾을 수 없습니다', robots: { index: false, follow: true } }
  return tagArchiveMetadata(name, 1)
}

export default async function TagPage({ params }: { params: Promise<Params> }) {
  const name = decodeSegment((await params).name)
  if (!name) notFound()
  return <TagArchivePage name={name} page={1} />
}
