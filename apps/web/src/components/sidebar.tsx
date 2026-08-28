import Link from 'next/link'
import type { ReactNode } from 'react'
import { ThemeToggle } from '@/components/themeToggle'
import { api, cached } from '@/lib/apiClient'

type TagCount = { name: string; count: number }
type SeriesItem = { slug: string; title: string; count: number }

/** API 가 죽어도 글은 읽을 수 있어야 한다 — 사이드바만 비운다. */
async function loadIndex(): Promise<{ tags: TagCount[]; series: SeriesItem[] }> {
  const [tags, series] = await Promise.all([
    api.tags
      .$get(undefined, cached(['tags']))
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data) => data.items.slice(0, 6))
      .catch(() => []),
    api.series
      .$get(undefined, cached(['series']))
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data) => data.items)
      .catch(() => []),
  ])

  return { tags, series }
}

/**
 * 좌측 인덱스. 글 상세에서는 상단에 목차가 끼어들도록 slot 을 열어둔다.
 * (와이어프레임 방향 B — 탐색 수단을 상시 노출한다)
 */
export async function Sidebar({ toc }: { toc?: ReactNode }) {
  const { tags, series } = await loadIndex()

  return (
    <aside className="-mx-2 sticky top-0 flex h-dvh flex-col gap-8 overflow-y-auto px-2 py-11 [scrollbar-width:none] max-lg:static max-lg:h-auto max-lg:gap-6 max-lg:border-border max-lg:border-b max-lg:py-7">
      <Link href="/" className="group block">
        <span className="inline-flex items-center gap-2 font-bold text-xl tracking-[-0.03em]">
          <span className="size-[7px] shrink-0 rounded-full bg-accent transition-transform group-hover:scale-[1.45]" />
          blogyu
        </span>
        <span className="mt-2 block text-[0.8125rem] text-fg-muted leading-relaxed">
          직접 경험한 것과 해결해본 것에 대해 씁니다.
          <br />
          대체로 실패한 이야기.
        </span>
      </Link>

      {toc}

      <search>
        <form action="/search" className="relative">
          <svg
            width="13"
            height="13"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
            className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-[0.6rem] text-fg-faint"
          >
            <circle cx="7" cy="7" r="4.6" stroke="currentColor" strokeWidth="1.4" />
            <path
              d="M10.5 10.5L14 14"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
          <input
            type="search"
            name="q"
            placeholder="검색"
            aria-label="블로그 검색"
            className="w-full rounded-sm border border-transparent bg-bg-subtle py-2 pr-3 pl-[1.9rem] text-[0.8125rem] transition-colors placeholder:text-fg-faint hover:border-border focus:border-border-strong focus:bg-bg"
          />
        </form>
      </search>

      {tags.length > 0 && (
        <div>
          <span className="label mb-[0.65rem] block">태그</span>
          <ul className="text-[0.8125rem]">
            {tags.map((tag) => (
              <li key={tag.name} className="mt-[0.15rem] first:mt-0">
                <Link
                  href={`/tags/${tag.name}`}
                  className="-ml-2 flex items-baseline justify-between gap-2 rounded-sm py-[0.22rem] pr-[0.45rem] pl-2 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg"
                >
                  <span>{tag.name}</span>
                  <span className="tabular text-[0.75rem] text-fg-faint">{tag.count}</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/tags"
            className="-ml-2 mt-1 block pl-2 text-[0.75rem] text-fg-faint transition-colors hover:text-accent-ink"
          >
            전체 태그 →
          </Link>
        </div>
      )}

      {series.length > 0 && (
        <div>
          <span className="label mb-[0.65rem] block">시리즈</span>
          <ul className="text-[0.8125rem]">
            {series.map((item) => (
              <li key={item.slug} className="mt-[0.15rem] first:mt-0">
                <Link
                  href={`/series/${item.slug}`}
                  className="-ml-2 flex items-baseline justify-between gap-2 rounded-sm py-[0.22rem] pr-[0.45rem] pl-2 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg"
                >
                  <span>{item.title}</span>
                  <span className="tabular text-[0.75rem] text-fg-faint">{item.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-auto flex items-center gap-3.5 border-border border-t pt-5 text-[0.75rem] text-fg-faint max-lg:mt-0">
        <a href="/feed.xml" className="transition-colors hover:text-fg">
          RSS
        </a>
        <a
          href="https://github.com/wjsrbgus04"
          target="_blank"
          rel="noreferrer"
          className="transition-colors hover:text-fg"
        >
          GitHub
        </a>
        <ThemeToggle />
      </div>
    </aside>
  )
}
