'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAdminSession } from '@/lib/useAdminSession'

const NAV = [{ href: '/admin', label: '글' }]

/** 어드민 상단 바. 스크롤해도 붙어 있고 배경을 살짝 흐린다. */
export function AdminBar() {
  const pathname = usePathname()
  const { admin, signOut } = useAdminSession()

  return (
    <header className="sticky top-0 z-20 border-border border-b bg-bg/85 backdrop-blur-[10px]">
      <div className="mx-auto flex max-w-[76rem] items-center gap-4 px-8 py-3.5 max-lg:px-6 max-sm:px-[1.15rem]">
        <Link href="/admin" className="inline-flex items-center gap-2 font-[620] text-[1.0625rem]">
          <span className="size-[7px] shrink-0 rounded-full bg-accent" />
          blogyu
          <span className="label">관리자</span>
        </Link>

        <nav className="ml-4 flex gap-0.5 max-sm:ml-0">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? 'page' : undefined}
              className={
                pathname === item.href
                  ? 'rounded-sm bg-bg-subtle px-2.5 py-1.5 font-[560] text-[1.0625rem] text-fg'
                  : 'rounded-sm px-2.5 py-1.5 text-[1.0625rem] text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg'
              }
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <Link
            href="/"
            className="rounded-sm px-2.5 py-1.5 text-[1.0625rem] text-fg-muted transition-colors hover:text-fg max-sm:hidden"
          >
            블로그 보기 ↗
          </Link>
          <button
            type="button"
            onClick={signOut}
            className="cursor-pointer rounded-sm px-2.5 py-1.5 text-[1.0625rem] text-fg-muted transition-colors hover:text-fg"
          >
            로그아웃
          </button>
          <span
            title={admin?.login}
            className="grid size-[1.6rem] shrink-0 place-items-center rounded-full border border-border bg-bg-elevated font-[560] text-[0.9375rem] text-fg-muted"
          >
            {admin?.login.slice(0, 2) ?? '··'}
          </span>
        </div>
      </div>
    </header>
  )
}
