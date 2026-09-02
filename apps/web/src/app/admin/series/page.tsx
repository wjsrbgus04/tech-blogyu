'use client'

import { useCallback, useEffect, useState } from 'react'
import { AdminBar } from '@/components/admin/adminBar'
import { api, uncached } from '@/lib/apiClient'

type Row = {
  id: string
  slug: string
  title: string
  description: string | null
  count: number
}

type Draft = { slug: string; title: string; description: string }

const EMPTY: Draft = { slug: '', title: '', description: '' }

/**
 * 입력 길이 제한. 서버(apps/api/src/lib/schemas.ts 의 SERIES_LIMITS)와 같은 값이어야 한다.
 */
const LIMITS = { slug: 60, title: 60, description: 200 } as const

const inputClass =
  'w-full rounded-sm border border-transparent bg-bg-subtle px-2.5 py-1.5 text-[0.8125rem] focus:border-border-strong focus:bg-bg'

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string }
    return body.error ?? fallback
  } catch {
    return fallback
  }
}

/** 시리즈 입력 폼. 새로 만들 때와 고칠 때 같은 필드를 쓴다. */
function SeriesForm({
  initial,
  submitLabel,
  busy,
  onSubmit,
  onCancel,
}: {
  initial: Draft
  submitLabel: string
  busy: boolean
  onSubmit: (draft: Draft) => void
  onCancel?: () => void
}) {
  const [draft, setDraft] = useState<Draft>(initial)

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit(draft)
      }}
    >
      <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
        <label className="block">
          <span className="mb-1 block text-[0.75rem] text-fg-muted">제목</span>
          <input
            value={draft.title}
            maxLength={LIMITS.title}
            required
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[0.75rem] text-fg-muted">주소 (소문자·숫자·하이픈)</span>
          <input
            value={draft.slug}
            maxLength={LIMITS.slug}
            required
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            onChange={(event) => setDraft({ ...draft, slug: event.target.value })}
            className={`mono ${inputClass}`}
          />
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-[0.75rem] text-fg-muted">설명 (선택)</span>
        <textarea
          value={draft.description}
          maxLength={LIMITS.description}
          rows={2}
          onChange={(event) => setDraft({ ...draft, description: event.target.value })}
          className={`resize-y leading-relaxed ${inputClass}`}
        />
      </label>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="cursor-pointer rounded-sm border border-fg bg-fg px-3.5 py-2 font-[600] text-[0.8125rem] text-bg transition-opacity hover:opacity-85 disabled:opacity-50"
        >
          {submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer rounded-sm border border-border px-3.5 py-2 font-[520] text-[0.8125rem] transition-colors hover:border-border-strong"
          >
            취소
          </button>
        )}
      </div>
    </form>
  )
}

export default function AdminSeriesPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  /** 만들기에 성공한 횟수. 새 시리즈 폼의 key 로 써서 그때만 폼이 비워진다. */
  const [createdCount, setCreatedCount] = useState(0)
  /** 삭제는 되돌릴 수 없으므로 같은 버튼을 두 번 눌러야 실행된다. */
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.admin.series.$get(undefined, uncached)
      if (res.status === 401) throw new Error('세션이 만료됐습니다. 다시 로그인해 주세요.')
      if (!res.ok) throw new Error('목록을 불러오지 못했습니다.')
      setRows((await res.json()).items as Row[])
    } catch (err) {
      setError(err instanceof Error ? err.message : '목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  /** 성공하면 목록을 다시 읽고, 실패하면 서버가 준 이유를 그대로 보여준다. */
  async function run(action: () => Promise<Response>, fallback: string) {
    setBusy(true)
    setError(null)
    try {
      const res = await action()
      if (!res.ok) throw new Error(await readError(res, fallback))
      await load()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : fallback)
      return false
    } finally {
      setBusy(false)
    }
  }

  const toBody = (draft: Draft) => ({
    slug: draft.slug.trim(),
    title: draft.title.trim(),
    description: draft.description.trim() || null,
  })

  async function create(draft: Draft) {
    const ok = await run(
      () => api.admin.series.$post({ json: toBody(draft) }, uncached),
      '시리즈를 만들지 못했습니다.',
    )
    if (ok) setCreatedCount((count) => count + 1)
  }

  async function update(id: string, draft: Draft) {
    const ok = await run(
      () => api.admin.series[':id'].$patch({ param: { id }, json: toBody(draft) }, uncached),
      '시리즈를 고치지 못했습니다.',
    )
    if (ok) setEditingId(null)
  }

  async function remove(id: string) {
    if (confirmingId !== id) {
      setConfirmingId(id)
      return
    }
    setConfirmingId(null)
    await run(
      () => api.admin.series[':id'].$delete({ param: { id } }, uncached),
      '시리즈를 지우지 못했습니다.',
    )
  }

  return (
    <>
      <AdminBar />

      <div className="mx-auto max-w-[76rem] px-8 pt-9 pb-24 max-lg:px-6 max-sm:px-[1.15rem]">
        <div className="mb-7">
          <h1 className="font-[640] text-2xl tracking-[-0.006em]">시리즈</h1>
          <p className="mt-1 text-[0.8125rem] text-fg-muted">
            글은 편집기의 시리즈 셀렉트에서 묶는다. 시리즈를 지워도 글은 남는다.
          </p>
        </div>

        {error && (
          <p className="mb-4 rounded-sm border border-border bg-bg-subtle px-4 py-3 text-[0.8125rem] text-fg-muted">
            {error}
          </p>
        )}

        <section className="mb-10 rounded-md border border-border p-4">
          <span className="label mb-3 block">새 시리즈</span>
          {/* 만들기에 성공하면 key 가 바뀌어 폼이 비워진다. 삭제·편집은 건드리지 않는다 */}
          <SeriesForm
            key={createdCount}
            initial={EMPTY}
            submitLabel="만들기"
            busy={busy}
            onSubmit={create}
          />
        </section>

        {loading ? (
          <p className="py-16 text-center text-[0.875rem] text-fg-faint">불러오는 중…</p>
        ) : rows.length === 0 ? (
          <p className="py-16 text-center text-[0.875rem] text-fg-faint">아직 시리즈가 없습니다.</p>
        ) : (
          <ul className="border-border border-t">
            {rows.map((row) => (
              <li key={row.id} className="border-border border-b py-4">
                {editingId === row.id ? (
                  <SeriesForm
                    initial={{
                      slug: row.slug,
                      title: row.title,
                      description: row.description ?? '',
                    }}
                    submitLabel="저장"
                    busy={busy}
                    onSubmit={(draft) => update(row.id, draft)}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <div className="flex flex-wrap items-start gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-[560] text-[0.9375rem]">{row.title}</p>
                      <p className="mono mt-0.5 text-[0.6875rem] text-fg-faint">
                        /series/{row.slug}
                      </p>
                      {row.description && (
                        <p className="mt-1.5 text-[0.8125rem] text-fg-muted">{row.description}</p>
                      )}
                    </div>
                    <span className="tabular text-[0.8125rem] text-fg-muted">{row.count}편</span>
                    <div className="flex gap-1 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setEditingId(row.id)}
                        className="cursor-pointer px-1.5 text-[0.75rem] text-fg-faint transition-colors hover:text-fg"
                      >
                        편집
                      </button>
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
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
