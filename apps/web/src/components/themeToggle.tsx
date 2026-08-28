'use client'

import { useEffect, useState } from 'react'

/**
 * 테마 토글. 초기 상태는 layout 의 인라인 스크립트가 이미 확정했으므로
 * 여기서는 DOM 의 현재 상태를 읽어 UI만 맞춘다.
 */
export function ThemeToggle() {
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  function toggle() {
    const root = document.documentElement
    const next = !root.classList.contains('dark')

    /**
     * 전환하는 순간에는 모든 transition 을 끈다.
     * 입력창처럼 배경·테두리에 transition 이 걸린 요소는 테마가 바뀔 때
     * 옛 색에서 새 색으로 보간되면서 한 번 깜빡인다.
     * 두 프레임 뒤에 되돌려 hover 같은 평소 동작은 그대로 둔다.
     */
    root.classList.add('theme-switching')
    root.classList.toggle('dark', next)
    setIsDark(next)

    const restore = () => root.classList.remove('theme-switching')
    // 보통은 두 프레임 뒤에 되돌린다
    requestAnimationFrame(() => requestAnimationFrame(restore))
    // 백그라운드 탭에서는 rAF 가 멈춘다. 타이머로도 반드시 해제해야
    // transition 이 영영 죽은 채로 남지 않는다.
    setTimeout(restore, 120)

    try {
      localStorage.setItem('blogyu-theme', next ? 'dark' : 'light')
    } catch {
      // 저장에 실패해도 이번 세션 동안은 동작한다
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
      className="ml-auto grid size-7 cursor-pointer place-items-center rounded-sm border border-border text-fg-muted transition-colors hover:border-border-strong hover:text-fg"
    >
      {isDark ? (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="3.1" stroke="currentColor" strokeWidth="1.3" />
          <path
            d="M8 1v1.6M8 13.4V15M15 8h-1.6M2.6 8H1M12.9 3.1l-1.1 1.1M4.2 11.8l-1.1 1.1M12.9 12.9l-1.1-1.1M4.2 4.2L3.1 3.1"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M13.5 9.6A5.8 5.8 0 016.4 2.5a5.9 5.9 0 107.1 7.1z"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  )
}
