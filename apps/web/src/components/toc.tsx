'use client'

import { useEffect, useRef, useState } from 'react'
import type { TocItem } from '@/lib/markdown'

/**
 * 목차. 넓은 화면에서 오른쪽 레일에 붙고, 스크롤에 따라 마젠타 마커가
 * hairline 레일 위를 움직인다. 좁은 화면에서는 본문 위에 놓인다.
 */
export function Toc({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? '')
  const listRef = useRef<HTMLOListElement>(null)
  const markerRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (items.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id)
        }
      },
      // 화면 상단 8% 지점을 지난 헤딩을 "지금 읽는 중"으로 본다
      { rootMargin: '-8% 0px -72% 0px', threshold: 0 },
    )

    const headings = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null)

    for (const heading of headings) observer.observe(heading)
    return () => observer.disconnect()
  }, [items])

  // 활성 항목 위치로 마커를 옮긴다. 레이아웃 값을 읽으므로 페인트 전에 계산한다.
  useEffect(() => {
    const list = listRef.current
    const marker = markerRef.current
    if (!list || !marker || !activeId) return

    const link = list.querySelector<HTMLAnchorElement>(`a[href="#${CSS.escape(activeId)}"]`)
    if (!link) return

    const offset = link.getBoundingClientRect().top - list.getBoundingClientRect().top
    marker.style.transform = `translateY(${offset}px)`
    marker.style.height = `${link.getBoundingClientRect().height}px`
  }, [activeId])

  if (items.length === 0) return null

  return (
    <aside className="sticky top-8 max-lg:static max-lg:mb-12">
      <span className="label mb-3 block">목차</span>
      <nav aria-label="목차" className="relative pl-4">
        <div aria-hidden="true" className="absolute top-1 bottom-1 left-0 w-px bg-border">
          <span
            ref={markerRef}
            className="absolute top-0 -left-px block h-[1.4rem] w-[2px] bg-accent transition-transform duration-200 ease-out"
          />
        </div>

        <ol ref={listRef} className="text-caption">
          {items.map((item) => (
            <li
              key={item.id}
              className={item.level === 3 ? 'ml-3 leading-[1.6rem]' : 'leading-[1.6rem]'}
            >
              <a
                href={`#${item.id}`}
                aria-current={activeId === item.id ? 'true' : undefined}
                onClick={() => setActiveId(item.id)}
                className={
                  activeId === item.id
                    ? 'block font-semibold'
                    : 'block text-fg-faint transition-colors hover:text-fg'
                }
              >
                {item.text}
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </aside>
  )
}
