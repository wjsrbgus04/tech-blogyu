import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[30rem] flex-col items-center justify-center px-6 text-center">
      <p className="label mb-3">404</p>
      <h1 className="mb-3 text-display font-semibold">찾는 글이 없습니다</h1>
      <p className="mb-8 text-body">주소가 바뀌었거나 아직 발행되지 않은 글일 수 있습니다.</p>
      <Link href="/" className="accent-link text-body">
        글 목록으로 →
      </Link>
    </div>
  )
}
