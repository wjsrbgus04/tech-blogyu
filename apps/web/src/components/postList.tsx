import Link from 'next/link'
import { formatDate, toIsoDate } from '@/lib/date'

export type PostSummary = {
  slug: string
  title: string
  excerpt: string
  publishedAt: string | null
  readingMinutes: number
  tags?: string[]
}

/**
 * 글 목록. hover 하면 왼쪽에서 인덱스가 밀려나온다 —
 * 시안에서 정한 두 시그니처 중 하나다. 마우스가 없는 화면에서는 숨긴다.
 */
export function PostList({ items, startIndex = 0 }: { items: PostSummary[]; startIndex?: number }) {
  if (items.length === 0) {
    return (
      <p className="py-16 text-center text-[1.1875rem] text-fg-faint">아직 쓴 글이 없습니다.</p>
    )
  }

  return (
    <ul>
      {items.map((post, index) => (
        <li key={post.slug} className="border-border border-b">
          <article className="group relative py-[1.9rem]">
            <span
              aria-hidden="true"
              className="tabular pointer-events-none absolute top-[1.95rem] -left-11 translate-x-1.5 text-[1.0625rem] text-accent-ink opacity-0 transition-[opacity,transform] duration-200 ease-out group-focus-within:translate-x-0 group-focus-within:opacity-100 group-hover:translate-x-0 group-hover:opacity-100 max-lg:hidden"
            >
              {startIndex + index + 1}
            </span>

            <p className="tabular mb-2 text-[1rem] text-fg-faint">
              <time dateTime={toIsoDate(post.publishedAt)}>{formatDate(post.publishedAt)}</time>
              <span aria-hidden="true"> · </span>
              {post.readingMinutes}분
            </p>

            <h2 className="mb-1.5 text-xl leading-[1.5] transition-colors group-hover:text-accent-ink">
              <Link href={`/posts/${post.slug}`}>{post.title}</Link>
            </h2>

            <p className="mb-3.5 line-clamp-2 max-w-[62ch] text-[1.1875rem] text-fg-muted leading-[1.7]">
              {post.excerpt}
            </p>

            {post.tags && post.tags.length > 0 && (
              <ul className="flex flex-wrap gap-1.5">
                {post.tags.map((tag) => (
                  <li key={tag}>
                    <Link href={`/tags/${tag}`} className="chip">
                      {tag}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </li>
      ))}
    </ul>
  )
}
