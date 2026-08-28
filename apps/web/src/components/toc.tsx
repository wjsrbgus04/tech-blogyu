'use client'

import { useEffect, useRef, useState } from 'react'
import type { TocItem } from '@/lib/markdown'

/**
 * 목차. 스크롤에 따라 액센트 마커가 레일 위를 움직인다 —
 * 시안에서 정한 두 시그니처 중 하나다.
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
    <div>
      <span className="label mb-[0.65rem] block">목차</span>
      <nav aria-label="목차" className="relative pl-[0.9rem]">
        <div aria-hidden="true" className="absolute top-1 bottom-1 left-0 w-px bg-border-strong">
          <span
            ref={markerRef}
            className="absolute top-0 -left-px block h-[1.35rem] w-[3px] rounded-sm bg-accent transition-transform duration-200 ease-out"
          />
        </div>

        <ol ref={listRef} className="text-[1.0625rem]">
          {items.map((item) => (
            <li
              key={item.id}
              className={
                item.level === 3 ? 'ml-3 text-[1rem] leading-[1.35rem]' : 'leading-[1.35rem]'
              }
            >
              <a
                href={`#${item.id}`}
                aria-current={activeId === item.id ? 'true' : undefined}
                onClick={() => setActiveId(item.id)}
                className={
                  activeId === item.id
                    ? 'block px-1 font-[560] text-fg'
                    : 'block px-1 text-fg-faint transition-colors hover:text-fg-muted'
                }
              >
                {item.text}
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  )
}
