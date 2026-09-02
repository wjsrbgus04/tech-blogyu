import type { ReactNode } from 'react'
import { SiteHeader } from '@/components/siteHeader'

/**
 * 페이지 골격 — 헤더 · 본문 · 푸터가 1200px 컨테이너 안에 세로로 쌓인다.
 * 사이드바는 없다. 넓은 화면에서 `aside`(글 상세의 목차)만 오른쪽 레일로 붙는다.
 * 섹션은 48px 여백으로만 나누고, 유일한 경계선은 푸터 위 hairline 이다.
 */
export function Shell({ aside, children }: { aside?: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[1200px] flex-col px-8 max-lg:px-6 max-sm:px-5">
      <SiteHeader />

      {aside ? (
        <div className="grid flex-1 grid-cols-[minmax(0,1fr)_14rem] items-start gap-x-16 pt-6 pb-24 max-lg:block">
          <main className="min-w-0">{children}</main>
          {aside}
        </div>
      ) : (
        <main className="min-w-0 flex-1 pt-6 pb-24">{children}</main>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-4 border-border border-t py-8 text-body">
        <span className="font-semibold">blogyu</span>
        <nav aria-label="바깥 링크" className="flex gap-5">
          <a href="/feed.xml" className="nav-link">
            RSS
          </a>
          <a
            href="https://github.com/wjsrbgus04"
            target="_blank"
            rel="noreferrer"
            className="nav-link"
          >
            GitHub
          </a>
        </nav>
      </footer>
    </div>
  )
}
