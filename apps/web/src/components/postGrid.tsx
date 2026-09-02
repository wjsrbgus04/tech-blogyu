import Link from 'next/link'
import { formatDateLong, toIsoDate } from '@/lib/date'

export type PostSummary = {
  slug: string
  title: string
  excerpt: string
  publishedAt: string | null
  readingMinutes: number
  coverImageUrl?: string | null
  tags?: string[]
}

/**
 * 카드에 쓸 이미지. 커버를 올리지 않은 글은 글별로 자동 생성되는 OG 이미지를 쓴다 —
 * 그래야 모든 카드가 이미지를 갖고, 디자인이 기대하는 "이미지가 절반" 밀도가 나온다.
 */
function postImage(post: Pick<PostSummary, 'slug' | 'coverImageUrl'>): string {
  return post.coverImageUrl ?? `/posts/${post.slug}/opengraph-image`
}

/**
 * 히어로 — 첫 화면 맨 위의 편집장 픽. 16:7 이미지 아래 날짜, 그 아래 40px 제목.
 * 테두리도 그림자도 없이 종이 위에 바로 놓인다.
 */
export function PostHero({ post }: { post: PostSummary }) {
  return (
    <article>
      <Link href={`/posts/${post.slug}`} className="block" tabIndex={-1} aria-hidden="true">
        {/* biome-ignore lint/performance/noImgElement: OG 폴백을 섞어 쓰므로 최적화 경로를 타지 않는다 */}
        <img
          src={postImage(post)}
          alt=""
          width={1200}
          height={525}
          className="aspect-[16/7] w-full object-cover"
          fetchPriority="high"
        />
      </Link>
      <p className="mt-5 text-caption">
        <time dateTime={toIsoDate(post.publishedAt)}>{formatDateLong(post.publishedAt)}</time>
      </p>
      <h2 className="mt-5 text-display font-semibold">
        <Link href={`/posts/${post.slug}`} className="title-link">
          {post.title}
        </Link>
      </h2>
    </article>
  )
}

/**
 * 3열 카드 그리드. 이미지 · 날짜 · 제목뿐이다 — 요약도 태그 pill 도 없다.
 * 날짜와 제목 사이 20px 이 이 페이지의 구조적 리듬이다.
 */
export function PostGrid({ items }: { items: PostSummary[] }) {
  if (items.length === 0) {
    return <p className="py-16 text-center text-body">아직 쓴 글이 없습니다.</p>
  }

  return (
    <ul className="grid grid-cols-3 gap-x-5 gap-y-12 max-md:grid-cols-2 max-sm:grid-cols-1">
      {items.map((post) => (
        <li key={post.slug}>
          <article>
            <Link href={`/posts/${post.slug}`} className="block" tabIndex={-1} aria-hidden="true">
              {/* biome-ignore lint/performance/noImgElement: OG 폴백을 섞어 쓰므로 최적화 경로를 타지 않는다 */}
              <img
                src={postImage(post)}
                alt=""
                width={800}
                height={600}
                loading="lazy"
                className="aspect-[4/3] w-full object-cover"
              />
            </Link>
            <p className="mt-4 text-caption">
              <time dateTime={toIsoDate(post.publishedAt)}>{formatDateLong(post.publishedAt)}</time>
            </p>
            <h2 className="mt-5 text-body-lg font-semibold lg:text-subheading">
              <Link href={`/posts/${post.slug}`} className="title-link">
                {post.title}
              </Link>
            </h2>
          </article>
        </li>
      ))}
    </ul>
  )
}
