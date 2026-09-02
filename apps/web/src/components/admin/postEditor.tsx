'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { previewMarkdown } from '@/app/admin/actions'
import { AdminBar } from '@/components/admin/adminBar'
import { API_URL, api, uncached } from '@/lib/apiClient'

type Status = 'draft' | 'published' | 'scheduled'

/**
 * 입력 길이 제한. 서버(apps/api/src/lib/schemas.ts 의 POST_LIMITS)와 같은 값이어야 한다.
 * 저장 버튼을 눌러야 알게 되는 대신 쓰는 동안 남은 글자 수가 보이도록 여기서도 건다.
 */
const LIMITS = {
  slug: 60,
  title: 100,
  excerpt: 160,
  content: 10_000,
  tag: 20,
  tagCount: 10,
} as const

export type EditorValue = {
  slug: string
  title: string
  excerpt: string
  content: string
  coverImageUrl: string | null
  status: Status
  publishedAt: string | null
  seriesId: string | null
  seriesOrder: number | null
  tags: string[]
}

const EMPTY: EditorValue = {
  slug: '',
  title: '',
  excerpt: '',
  content: '',
  coverImageUrl: null,
  status: 'draft',
  publishedAt: null,
  seriesId: null,
  seriesOrder: null,
  tags: [],
}

const TOOLS = [
  { label: 'H2', before: '\n## ', after: '' },
  { label: 'H3', before: '\n### ', after: '' },
  { label: 'B', before: '**', after: '**' },
  { label: 'i', before: '_', after: '_' },
  { label: '링크', before: '[', after: '](https://)' },
  { label: '인용', before: '\n> ', after: '' },
  { label: '목록', before: '\n- ', after: '' },
  { label: '코드', before: '\n```ts\n', after: '\n```\n' },
  { label: '표', before: '\n| 항목 | 값 |\n| --- | --- |\n| ', after: ' |  |\n' },
] as const

/** datetime-local 입력은 초·타임존이 없는 'YYYY-MM-DDTHH:mm' 형태를 쓴다. */
function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function PostEditor({ postId, initial }: { postId?: string; initial?: EditorValue }) {
  const router = useRouter()
  const [value, setValue] = useState<EditorValue>(initial ?? EMPTY)
  const [tagInput, setTagInput] = useState('')
  const [tab, setTab] = useState<'write' | 'preview'>('write')
  const [previewHtml, setPreviewHtml] = useState('')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [seriesList, setSeriesList] = useState<{ id: string; title: string }[]>([])
  /** 외부 이미지 주소를 붙여넣는 칸. 업로드 없이 커버를 지정할 때 쓴다. */
  const [coverUrlDraft, setCoverUrlDraft] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const patch = useCallback((next: Partial<EditorValue>) => {
    setValue((prev) => ({ ...prev, ...next }))
    setDirty(true)
  }, [])

  useEffect(() => {
    api.admin.series
      .$get(undefined, uncached)
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data) => setSeriesList(data.items))
      .catch(() => {})
  }, [])

  // 저장하지 않은 글을 실수로 날리는 게 가장 뼈아프다
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  /** 툴바·이미지 삽입. 선택 영역을 감싸고 커서를 삽입 지점으로 되돌린다. */
  function insert(before: string, after: string) {
    const el = textareaRef.current
    if (!el) return

    const { selectionStart, selectionEnd, value: text } = el
    const selected = text.slice(selectionStart, selectionEnd)
    const next = `${text.slice(0, selectionStart)}${before}${selected}${after}${text.slice(selectionEnd)}`

    patch({ content: next })
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(
        selectionStart + before.length,
        selectionStart + before.length + selected.length,
      )
    })
  }

  async function uploadImage(file: File) {
    setStatus('이미지 올리는 중…')
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`${API_URL}/admin/uploads`, {
        method: 'POST',
        body: form,
        credentials: 'include',
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? '업로드 실패')
      const { url } = (await res.json()) as { url: string }
      insert(`![](${url})`, '')
      setStatus('이미지를 넣었습니다.')
    } catch (err) {
      setError(err instanceof Error ? err.message : '이미지 업로드에 실패했습니다.')
      setStatus(null)
    }
  }

  function handleDrop(event: React.DragEvent<HTMLTextAreaElement>) {
    const file = event.dataTransfer.files[0]
    if (!file?.type.startsWith('image/')) return
    event.preventDefault()
    void uploadImage(file)
  }

  function handlePaste(event: React.ClipboardEvent<HTMLTextAreaElement>) {
    const file = Array.from(event.clipboardData.files)[0]
    if (!file?.type.startsWith('image/')) return
    event.preventDefault()
    void uploadImage(file)
  }

  async function openPreview() {
    setTab('preview')
    setPreviewHtml(await previewMarkdown(value.content))
  }

  function addTag(raw: string) {
    const tag = raw.trim().toLowerCase().replace(/\s+/g, '-')
    if (!tag || value.tags.includes(tag) || value.tags.length >= LIMITS.tagCount) return
    patch({ tags: [...value.tags, tag] })
    setTagInput('')
  }

  /**
   * 예약은 미래 시각이 있어야 성립한다. 시각이 비었거나 지난 시각이면
   * 서버가 지금 시각으로 채워 즉시 공개해버리므로 저장 전에 막는다.
   */
  function scheduleProblem(next: Status): string | null {
    if (next !== 'scheduled') return null
    if (!value.publishedAt) return '예약하려면 발행 시각을 지정해 주세요.'
    if (new Date(value.publishedAt) <= new Date()) {
      return '예약 시각이 이미 지났습니다. 지금보다 뒤의 시각을 골라주세요.'
    }
    return null
  }

  async function save(nextStatus?: Status) {
    const resolved = nextStatus ?? value.status

    const problem = scheduleProblem(resolved)
    if (problem) {
      setError(problem)
      setStatus(null)
      return
    }

    setSaving(true)
    setError(null)
    setStatus(null)

    const body = {
      ...value,
      status: resolved,
      coverImageUrl: value.coverImageUrl || null,
      publishedAt: value.publishedAt || null,
      seriesId: value.seriesId || null,
    }

    try {
      const res = postId
        ? await api.admin.posts[':id'].$patch({ param: { id: postId }, json: body }, uncached)
        : await api.admin.posts.$post({ json: body }, uncached)

      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(payload.error ?? '저장에 실패했습니다.')
      }

      const saved = (await res.json()) as { id: string }
      setDirty(false)
      setStatus(resolved === 'scheduled' ? '예약했습니다.' : '저장했습니다.')
      setValue((prev) => ({ ...prev, status: resolved }))

      if (resolved === 'draft') {
        // 임시저장은 아직 쓰는 중이므로 편집 화면에 머문다.
        // 새 글이면 주소만 편집 URL 로 바꿔 새로고침해도 이어서 쓸 수 있게 한다.
        if (!postId) router.replace(`/admin/posts/${saved.id}`)
        return
      }

      // 발행·예약은 한 편이 끝난 것이다. 목록으로 돌려보내면 방금 올린 글이
      // 맨 위에 보여서 결과 확인과 다음 작업이 한 화면에서 이어진다.
      router.push('/admin')
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <AdminBar />

      <div className="mx-auto max-w-[76rem] px-8 pt-9 pb-24 max-lg:px-6 max-sm:px-[1.15rem]">
        <div className="mb-6 flex flex-wrap items-center gap-3 border-border border-b pb-[1.1rem]">
          <Link
            href="/admin"
            className="text-[0.8125rem] text-fg-muted transition-colors hover:text-fg"
          >
            ← 글
          </Link>

          {status && (
            <span className="inline-flex items-center gap-1.5 text-[0.75rem] text-fg-faint before:size-[5px] before:rounded-full before:bg-accent before:content-['']">
              {status}
            </span>
          )}
          {dirty && !status && (
            <span className="text-[0.75rem] text-fg-faint">저장하지 않은 변경이 있습니다</span>
          )}

          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={() => (tab === 'write' ? openPreview() : setTab('write'))}
              className="cursor-pointer rounded-sm border border-border px-3.5 py-2 font-[520] text-[0.8125rem] transition-colors hover:border-border-strong hover:bg-bg-subtle"
            >
              {tab === 'write' ? '미리보기' : '편집'}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => save('draft')}
              className="cursor-pointer rounded-sm border border-border px-3.5 py-2 font-[520] text-[0.8125rem] transition-colors hover:border-border-strong hover:bg-bg-subtle disabled:opacity-50"
            >
              임시저장
            </button>
            <button
              type="button"
              disabled={saving}
              /* 라디오에서 고른 상태가 곧 발행 방식이다. 여기서 'published' 를
                 강제하면 예약을 골라도 즉시 발행으로 저장돼 버린다. */
              onClick={() => save(value.status === 'draft' ? 'published' : value.status)}
              className="cursor-pointer rounded-sm border border-fg bg-fg px-3.5 py-2 font-[600] text-[0.8125rem] text-bg transition-opacity hover:opacity-85 disabled:opacity-50"
            >
              {saving ? '저장 중…' : value.status === 'scheduled' ? '예약 발행' : '발행'}
            </button>
          </div>
        </div>

        {error && (
          <p className="mb-4 rounded-sm border border-border bg-bg-subtle px-4 py-3 text-[0.8125rem] text-fg">
            {error}
          </p>
        )}

        <label htmlFor="post-title" className="label mb-2 block">
          제목
        </label>
        <input
          id="post-title"
          value={value.title}
          onChange={(event) => patch({ title: event.target.value })}
          maxLength={LIMITS.title}
          placeholder="제목"
          className="mb-5 w-full border-border border-b bg-transparent pb-4 font-bold text-[1.75rem] leading-[1.4] tracking-[-0.008em] outline-none placeholder:text-fg-faint focus:border-accent"
        />

        <div className="grid grid-cols-[minmax(0,1fr)_17.5rem] items-start gap-8 max-lg:block">
          <div>
            {tab === 'write' ? (
              <>
                <div
                  role="toolbar"
                  aria-label="서식"
                  className="flex flex-wrap gap-0.5 rounded-t-md border border-border border-b-0 bg-bg-subtle p-1.5"
                >
                  {TOOLS.map((tool) => (
                    <button
                      key={tool.label}
                      type="button"
                      onClick={() => insert(tool.before, tool.after)}
                      className="cursor-pointer rounded-[4px] px-2 py-1 text-[0.8125rem] text-fg-muted transition-colors hover:bg-bg hover:text-fg"
                    >
                      {tool.label}
                    </button>
                  ))}
                  <label className="ml-auto cursor-pointer rounded-[4px] px-2 py-1 text-[0.8125rem] text-fg-muted transition-colors hover:bg-bg hover:text-fg">
                    이미지
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (file) void uploadImage(file)
                        event.target.value = ''
                      }}
                    />
                  </label>
                </div>

                <label htmlFor="post-body" className="sr-only">
                  본문 마크다운
                </label>
                <textarea
                  id="post-body"
                  ref={textareaRef}
                  value={value.content}
                  onChange={(event) => patch({ content: event.target.value })}
                  maxLength={LIMITS.content}
                  onDrop={handleDrop}
                  onPaste={handlePaste}
                  spellCheck={false}
                  className="mono min-h-[26rem] w-full resize-y border border-border bg-bg p-[1.15rem] text-[0.8125rem] leading-[1.85] text-fg-muted outline-none focus:border-border-strong"
                />

                <p className="rounded-b-md border border-border border-t-0 border-dashed p-3.5 text-center text-[0.75rem] text-fg-faint">
                  이미지를 끌어다 놓거나 붙여넣으면 R2에 올리고 마크다운을 삽입합니다
                </p>

                <p className="mono mt-1.5 text-right text-[0.625rem] text-fg-faint">
                  {value.content.length.toLocaleString()} / {LIMITS.content.toLocaleString()}
                </p>
              </>
            ) : (
              <div className="rounded-md border border-border p-6">
                {/* biome-ignore lint/security/noDangerouslySetInnerHtml: 서버 액션이 렌더한 본인 글 */}
                <div className="prose" dangerouslySetInnerHTML={{ __html: previewHtml }} />
              </div>
            )}
          </div>

          <aside
            aria-label="글 설정"
            className="overflow-hidden rounded-md border border-border max-lg:mt-6"
          >
            <section className="border-border border-b p-4">
              <span className="label mb-3 block">발행</span>
              <div className="flex flex-col gap-2 text-[0.8125rem] text-fg-muted">
                {(['published', 'draft', 'scheduled'] as const).map((option) => (
                  <label key={option} className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="status"
                      checked={value.status === option}
                      onChange={() => patch({ status: option })}
                      className="accent-[var(--color-accent)]"
                    />
                    {option === 'published' ? '발행됨' : option === 'draft' ? '임시저장' : '예약'}
                  </label>
                ))}
              </div>

              {value.status === 'scheduled' && (
                <div className="mt-3">
                  <label htmlFor="published-at" className="mb-1 block text-[0.75rem] text-fg-muted">
                    발행 시각
                  </label>
                  <input
                    id="published-at"
                    type="datetime-local"
                    value={toLocalInput(value.publishedAt)}
                    onChange={(event) =>
                      patch({
                        publishedAt: event.target.value
                          ? new Date(event.target.value).toISOString()
                          : null,
                      })
                    }
                    className="w-full rounded-sm border border-transparent bg-bg-subtle px-2.5 py-1.5 text-[0.8125rem] focus:border-border-strong focus:bg-bg"
                  />
                </div>
              )}
            </section>

            <section className="border-border border-b p-4">
              <span className="label mb-3 block">주소</span>
              <input
                value={value.slug}
                onChange={(event) => patch({ slug: event.target.value })}
                maxLength={LIMITS.slug}
                placeholder="edge-postgres-connection"
                aria-label="슬러그"
                className="w-full rounded-sm border border-transparent bg-bg-subtle px-2.5 py-1.5 text-[0.8125rem] focus:border-border-strong focus:bg-bg"
              />
              <p className="mono mt-1.5 text-[0.625rem] text-fg-faint">
                /posts/{value.slug || '…'}
              </p>
            </section>

            <section className="border-border border-b p-4">
              <span className="label mb-3 block">요약</span>
              <textarea
                value={value.excerpt}
                onChange={(event) => patch({ excerpt: event.target.value })}
                maxLength={LIMITS.excerpt}
                aria-label="요약"
                className="min-h-[5.5rem] w-full resize-y rounded-sm border border-transparent bg-bg-subtle px-2.5 py-1.5 text-[0.8125rem] leading-relaxed focus:border-border-strong focus:bg-bg"
              />
              <p className="mono mt-1.5 text-[0.625rem] text-fg-faint">
                {value.excerpt.length} / {LIMITS.excerpt}
              </p>
            </section>

            <section className="border-border border-b p-4">
              <span className="label mb-3 block">태그</span>
              {value.tags.length > 0 && (
                <ul className="mb-2.5 flex flex-wrap gap-1.5">
                  {value.tags.map((tag) => (
                    <li key={tag}>
                      <button
                        type="button"
                        onClick={() => patch({ tags: value.tags.filter((item) => item !== tag) })}
                        className="chip cursor-pointer"
                      >
                        {tag} ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <input
                value={tagInput}
                onChange={(event) => setTagInput(event.target.value)}
                maxLength={LIMITS.tag}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') return
                  event.preventDefault()
                  addTag(tagInput)
                }}
                placeholder="입력 후 Enter"
                aria-label="태그 추가"
                className="w-full rounded-sm border border-transparent bg-bg-subtle px-2.5 py-1.5 text-[0.8125rem] focus:border-border-strong focus:bg-bg"
              />
            </section>

            <section className="border-border border-b p-4">
              <span className="label mb-3 block">시리즈</span>
              <select
                value={value.seriesId ?? ''}
                onChange={(event) => patch({ seriesId: event.target.value || null })}
                aria-label="시리즈"
                className="w-full rounded-sm border border-transparent bg-bg-subtle px-2.5 py-1.5 text-[0.8125rem] focus:border-border-strong focus:bg-bg"
              >
                <option value="">— 없음 —</option>
                {seriesList.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
              {value.seriesId && (
                <input
                  type="number"
                  min={1}
                  value={value.seriesOrder ?? ''}
                  onChange={(event) =>
                    patch({ seriesOrder: event.target.value ? Number(event.target.value) : null })
                  }
                  placeholder="몇 번째 글"
                  aria-label="시리즈 순서"
                  className="mt-2 w-full rounded-sm border border-transparent bg-bg-subtle px-2.5 py-1.5 text-[0.8125rem] focus:border-border-strong focus:bg-bg"
                />
              )}
            </section>

            <section className="p-4">
              <span className="label mb-3 block">커버 이미지</span>
              {value.coverImageUrl ? (
                <div>
                  {/* 어드민 미리보기라 next/image 최적화가 필요 없다 */}
                  {/* biome-ignore lint/performance/noImgElement: 어드민 전용 미리보기 */}
                  <img
                    src={value.coverImageUrl}
                    alt=""
                    className="w-full rounded-sm border border-border"
                  />
                  <button
                    type="button"
                    onClick={() => patch({ coverImageUrl: null })}
                    className="mt-2 cursor-pointer text-[0.75rem] text-fg-faint transition-colors hover:text-fg"
                  >
                    제거
                  </button>
                </div>
              ) : (
                <div>
                  <label className="grid min-h-[5.5rem] cursor-pointer place-items-center rounded-sm border border-border-strong border-dashed text-[0.75rem] text-fg-faint transition-colors hover:text-fg">
                    1200 × 630 올리기
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={async (event) => {
                        const file = event.target.files?.[0]
                        event.target.value = ''
                        if (!file) return

                        const form = new FormData()
                        form.append('file', file)
                        const res = await fetch(`${API_URL}/admin/uploads`, {
                          method: 'POST',
                          body: form,
                          credentials: 'include',
                        })
                        if (res.ok) {
                          const { url } = (await res.json()) as { url: string }
                          patch({ coverImageUrl: url })
                        } else {
                          setError('커버 이미지 업로드에 실패했습니다.')
                        }
                      }}
                    />
                  </label>
                  <form
                    className="mt-2 flex gap-1.5"
                    onSubmit={(event) => {
                      event.preventDefault()
                      const url = coverUrlDraft.trim()
                      if (!URL.canParse(url)) {
                        setError('커버 이미지 주소가 올바르지 않습니다.')
                        return
                      }
                      patch({ coverImageUrl: url })
                      setCoverUrlDraft('')
                    }}
                  >
                    <input
                      value={coverUrlDraft}
                      onChange={(event) => setCoverUrlDraft(event.target.value)}
                      placeholder="또는 이미지 주소 붙여넣기"
                      aria-label="커버 이미지 주소"
                      className="min-w-0 flex-1 rounded-sm border border-transparent bg-bg-subtle px-2.5 py-1.5 text-[0.75rem] focus:border-border-strong focus:bg-bg"
                    />
                    <button
                      type="submit"
                      disabled={!coverUrlDraft.trim()}
                      className="cursor-pointer rounded-sm border border-border px-2.5 py-1.5 text-[0.75rem] transition-colors hover:border-border-strong disabled:opacity-50"
                    >
                      넣기
                    </button>
                  </form>
                </div>
              )}
              <p className="mt-1.5 text-[0.625rem] text-fg-faint leading-relaxed">
                비우면 제목·태그로 OG 이미지를 생성합니다
              </p>
            </section>
          </aside>
        </div>
      </div>
    </>
  )
}
