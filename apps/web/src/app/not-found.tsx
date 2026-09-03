import type { Metadata } from 'next'
import Link from 'next/link'

/**
 * Next 가 404 상태와 noindex 메타는 알아서 붙인다. 그래도 여기서 한 번 더 적는다 —
 * 루트의 robots(미리보기 상한)를 그대로 물려받으면 같은 문서에 robots 메타가
 * 둘 나가는데, 이렇게 덮어써야 이 페이지의 메타가 noindex 하나로 정리된다.
 */
export const metadata: Metadata = {
  title: '찾는 글이 없습니다',
  robots: { index: false, follow: true },
}

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
