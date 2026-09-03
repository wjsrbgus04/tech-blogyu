import Link from 'next/link'

/** 로고 마크 — 파비콘(app/icon.svg)과 같은 글리프. 두 곳이 어긋나지 않게 값을 그대로 옮겼다. */
function Mark() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 64 64"
      aria-hidden="true"
      className="shrink-0 self-center"
    >
      <rect width="64" height="64" rx="8" fill="#0A0A0B" />
      <g fill="#FAFAFA">
        <path d="M16 12h32v8H16z" />
        <path d="M40 12h8v20h-8z" />
        <path d="M8 32h48v8H8z" />
        <path d="M20 40h8v12h-8z" />
        <path d="M36 40h8v12h-8z" />
      </g>
    </svg>
  )
}

/**
 * 상단 헤더 — 로고 락업 · 내비 · 검색 트리거 한 줄.
 * sticky 도, 배경 띠도, 경계선도 없다. 흰 종이 위에 글자만 놓인다.
 *
 * 세 항목은 글자 크기가 달라(로고 20px, 나머지 16px) 가운데 정렬로는 높이가
 * 어긋나 보인다. 베이스라인으로 맞추고, 글자가 아닌 아이콘은 self-center 로 빼서
 * 컨테이너의 베이스라인이 글자에서 나오게 한다.
 */
export function SiteHeader() {
  return (
    <header className="flex flex-wrap items-baseline gap-x-6 gap-y-4 py-7">
      <Link href="/" className="inline-flex items-baseline gap-2 text-[28px]">
        <Mark />
        <span>
          <b className="font-bold">blog</b>
          <span className="font-normal">yu</span>
        </span>
      </Link>

      <nav
        aria-label="주요"
        className="flex flex-wrap items-baseline gap-x-5 gap-y-2 ml-auto text-body"
      >
        <Link href="/tags" className="nav-link">
          태그
        </Link>
        <Link href="/series" className="nav-link">
          시리즈
        </Link>
      </nav>

      <Link
        href="/search"
        className="nav-link inline-flex items-baseline gap-1.5 text-body max-sm:ml-0"
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
          className="self-center"
        >
          <circle cx="7" cy="7" r="4.6" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M10.5 10.5L14 14"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
        검색
      </Link>
    </header>
  )
}
