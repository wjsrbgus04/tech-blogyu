import type { ReactNode } from 'react'

/** 방향 B — 좌측 고정 인덱스 + 본문. 좁은 화면에서는 위아래로 쌓인다. */
export function Shell({ sidebar, children }: { sidebar: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto grid max-w-[66rem] grid-cols-[15.5rem_minmax(0,1fr)] items-start gap-x-[4.5rem] px-8 max-lg:block max-lg:px-6 max-sm:px-[1.15rem]">
      {sidebar}
      <main className="min-w-0 pt-11 pb-32 max-lg:pt-8">{children}</main>
    </div>
  )
}
