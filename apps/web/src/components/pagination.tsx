import Link from 'next/link'

/** 무한 스크롤 대신 페이지네이션 — 딥링크와 크롤링에 유리하다. */
export function Pagination({
  page,
  totalPages,
  basePath = '/',
}: {
  page: number
  totalPages: number
  basePath?: string
}) {
  if (totalPages <= 1) return null

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1)
  const href = (target: number) => (target === 1 ? basePath : `${basePath}?page=${target}`)

  return (
    <nav aria-label="페이지" className="mt-12 flex justify-end gap-2 border-border border-t pt-6">
      {pages.map((target) =>
        target === page ? (
          <span
            key={target}
            aria-current="page"
            className="tabular min-w-9 bg-fg px-2 py-1.5 text-center text-caption font-semibold text-bg"
          >
            {target}
          </span>
        ) : (
          <Link
            key={target}
            href={href(target)}
            className="tabular min-w-9 border border-border px-2 py-1.5 text-center text-caption font-semibold transition-colors hover:border-fg"
          >
            {target}
          </Link>
        ),
      )}
    </nav>
  )
}
