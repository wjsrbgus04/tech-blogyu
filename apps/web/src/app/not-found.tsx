import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[30rem] flex-col items-center justify-center px-6 text-center">
      <p className="label mb-3">404</p>
      <h1 className="mb-3 font-bold text-2xl tracking-[-0.008em]">찾는 글이 없습니다</h1>
      <p className="mb-8 text-[0.9375rem] text-fg-muted">
        주소가 바뀌었거나 아직 발행되지 않은 글일 수 있습니다.
      </p>
      <Link
        href="/"
        className="rounded-sm border border-border px-4 py-2 text-[0.875rem] text-fg-muted transition-colors hover:border-border-strong hover:text-fg"
      >
        글 목록으로
      </Link>
    </div>
  )
}
