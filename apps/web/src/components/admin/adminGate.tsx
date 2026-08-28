'use client'

import type { ReactNode } from 'react'
import { useAdminSession } from '@/lib/useAdminSession'

/** 로그인하지 않았으면 어드민 화면 대신 로그인 카드를 보여준다. */
export function AdminGate({ children }: { children: ReactNode }) {
  const { state, signIn } = useAdminSession()

  if (state === 'loading') {
    return (
      <div className="grid min-h-dvh place-items-center">
        <p className="text-[1.125rem] text-fg-faint">확인하는 중…</p>
      </div>
    )
  }

  if (state === 'guest') {
    return (
      <div className="grid min-h-dvh place-items-center px-8">
        <div className="w-full max-w-[22rem] text-center">
          <span className="inline-flex items-center justify-center gap-2 font-bold text-2xl tracking-[-0.03em]">
            <span className="size-[7px] shrink-0 rounded-full bg-accent" />
            blogyu
          </span>

          <h1 className="mt-8 mb-1.5 text-[1.1875rem]">관리자 로그인</h1>
          <p className="mb-6 text-[1.0625rem] text-fg-muted">허용된 GitHub 계정만 통과합니다.</p>

          <button
            type="button"
            onClick={signIn}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-sm border border-border-strong bg-fg px-4 py-2.5 font-[560] text-[1.125rem] text-bg transition-opacity hover:opacity-90 active:scale-[0.985]"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 005.47 7.59c.4.07.55-.17.55-.38l-.01-1.49C3.8 14.15 3.34 12.9 3.34 12.9c-.36-.92-.88-1.16-.88-1.16-.72-.49.06-.48.06-.48.79.06 1.21.82 1.21.82.71 1.21 1.86.86 2.31.66.07-.51.28-.86.5-1.06-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 014 0c1.53-1.03 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48l-.01 2.2c0 .21.15.46.55.38A8 8 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            GitHub으로 계속하기
          </button>

          <p className="mt-4 text-[1rem] text-fg-faint leading-relaxed">
            세션은 httpOnly 쿠키로 7일간 유지됩니다.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
