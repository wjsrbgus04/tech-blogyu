'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { AdminBar } from '@/components/admin/adminBar'
import { api, uncached } from '@/lib/apiClient'
import { formatDate } from '@/lib/date'

type Status = 'draft' | 'published' | 'scheduled'
type Filter = 'all' | Status

type Row = {
  id: string
  slug: string
  title: string
  status: Status
  publishedAt: string | null
  updatedAt: string
  viewCount: number
  likeCount: number
}

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'published', label: '발행' },
  { key: 'draft', label: '임시' },
]

const STATUS_LABEL: Record<Status, string> = {
  published: '발행됨',
  draft: '임시저장',
  scheduled: '예약됨',
}

export default function AdminPostsPage() {
  const [filter, setFilter] = useState<Filter>('all')
  const [rows, setRows] = useState<Row[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  /** 삭제는 되돌릴 수 없으므로 같은 버튼을 두 번 눌러야 실행된다. */
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.admin.posts.$get({ query: { status: filter } }, uncached)
      if (!res.ok) throw new Error('목록을 불러오지 못했습니다.')
      const data = await res.json()
      setRows(data.items as Row[])
      setCounts(data.counts)
    } catch (err) {
      setError(err instanceof Error ? err.message : '목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    void load()
  }, [load])

  async function remove(id: string) {
    if (confirmingId !== id) {
      setConfirmingId(id)
      return
    }
    setConfirmingId(null)
    try {
      const res = await api.admin.posts[':id'].$delete({ param: { id } }, uncached)
      if (!res.ok) throw new Error('삭제에 실패했습니다.')
      setRows((prev) => prev.filter((row) => row.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제에 실패했습니다.')
    }
  }

  const total = Object.values(counts).reduce((sum, count) => sum + count, 0) || rows.length

  return (
    <>
      <AdminBar />

      <div className="mx-auto max-w-[76rem] px-8 pt-9 pb-24 max-lg:px-6 max-sm:px-[1.15rem]">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-[640] text-2xl tracking-[-0.006em]">글</h1>
            <p className="mt-1 text-[0.8125rem] text-fg-muted">최근 수정순 · 전체 {total}편</p>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="inline-flex gap-0.5 rounded-sm bg-bg-subtle p-[3px]">
              {FILTERS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  aria-pressed={filter === item.key}
                  onClick={() => setFilter(item.key)}
                  className={
                    filter === item.key
                      ? 'cursor-pointer rounded-[4px] bg-bg px-2.5 py-1 font-[520] text-[0.75rem] text-fg shadow-sm'
                      : 'cursor-pointer rounded-[4px] px-2.5 py-1 font-[520] text-[0.75rem] text-fg-muted transition-colors hover:text-fg'
                  }
                >
                  {item.label}
                  {item.key !== 'all' && counts[item.key] !== undefined && (
                    <span className="tabular ml-1 text-[0.6875rem] opacity-60">
                      {counts[item.key]}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <Link
              href="/admin/posts/new"
              className="rounded-sm border border-accent bg-accent px-3.5 py-2 font-[600] text-[0.8125rem] text-accent-fg transition-[filter] hover:brightness-105"
            >
              새 글
            </Link>
          </div>
        </div>

        {error && (
          <p className="mb-4 rounded-sm border border-border bg-bg-subtle px-4 py-3 text-[0.8125rem] text-fg-muted">
            {error}
          </p>
        )}

        {loading ? (
          <p className="py-16 text-center text-[0.875rem] text-fg-faint">불러오는 중…</p>
        ) : rows.length === 0 ? (
          <p className="py-16 text-center text-[0.875rem] text-fg-faint">글이 없습니다.</p>
        ) : (
          <table className="w-full border-collapse text-[0.875rem]">
            <thead>
              <tr>
                <th className="border-border border-b px-2.5 pb-2.5 text-left font-[560] text-[0.75rem] text-fg-faint">
                  제목
                </th>
                <th className="border-border border-b px-2.5 pb-2.5 text-left font-[560] text-[0.75rem] text-fg-faint">
                  상태
                </th>
                <th className="border-border border-b px-2.5 pb-2.5 text-left font-[560] text-[0.75rem] text-fg-faint max-sm:hidden">
                  발행일
                </th>
                <th className="border-border border-b px-2.5 pb-2.5 text-right font-[560] text-[0.75rem] text-fg-faint max-sm:hidden">
                  조회
                </th>
                <th className="border-border border-b px-2.5 pb-2.5 text-right font-[560] text-[0.75rem] text-fg-faint max-sm:hidden">
                  좋아요
                </th>
                <th className="border-border border-b px-2.5 pb-2.5 text-right">
                  <span className="sr-only">작업</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="transition-colors hover:bg-bg-subtle">
                  <td className="border-border border-b px-2.5 py-3.5 align-middle">
                    <Link
                      href={`/admin/posts/${row.id}`}
                      className="mb-0.5 block font-[560] transition-colors hover:text-accent-ink"
                    >
                      {row.title}
                    </Link>
                    <span className="mono text-[0.6875rem] text-fg-faint">/{row.slug}</span>
                  </td>

                  <td className="border-border border-b px-2.5 py-3.5 align-middle">
                    <span
                      className={
                        row.status === 'published'
                          ? 'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-accent-weak px-2 py-0.5 text-[0.75rem] text-accent-ink'
                          : 'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border px-2 py-0.5 text-[0.75rem] text-fg-muted'
                      }
                    >
                      <span
                        aria-hidden="true"
                        className={`size-[5px] rounded-full ${row.status === 'published' ? 'bg-accent' : 'bg-fg-faint'}`}
                      />
                      {STATUS_LABEL[row.status]}
                    </span>
                  </td>

                  <td className="border-border border-b px-2.5 py-3.5 align-middle text-[0.8125rem] text-fg-faint max-sm:hidden">
                    {row.publishedAt ? formatDate(row.publishedAt) : '—'}
                  </td>
                  <td className="tabular border-border border-b px-2.5 py-3.5 text-right align-middle text-fg-muted max-sm:hidden">
                    {row.viewCount.toLocaleString('ko-KR')}
                  </td>
                  <td className="tabular border-border border-b px-2.5 py-3.5 text-right align-middle text-fg-muted max-sm:hidden">
                    {row.likeCount.toLocaleString('ko-KR')}
                  </td>

                  <td className="whitespace-nowrap border-border border-b px-2.5 py-3.5 text-right align-middle">
                    <Link
                      href={`/admin/posts/${row.id}`}
                      className="px-1.5 text-[0.75rem] text-fg-faint transition-colors hover:text-fg"
                    >
                      편집
                    </Link>
                    {row.status === 'published' && (
                      <Link
                        href={`/posts/${row.slug}`}
                        className="px-1.5 text-[0.75rem] text-fg-faint transition-colors hover:text-fg"
                      >
                        보기
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => remove(row.id)}
                      onBlur={() => setConfirmingId(null)}
                      className={
                        confirmingId === row.id
                          ? 'cursor-pointer px-1.5 font-[560] text-[0.75rem] text-accent-ink'
                          : 'cursor-pointer px-1.5 text-[0.75rem] text-fg-faint transition-colors hover:text-fg'
                      }
                    >
                      {confirmingId === row.id ? '정말 삭제?' : '삭제'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
