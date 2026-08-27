import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Comments } from '@/components/comments'
import { Reactions } from '@/components/reactions'
import { Shell } from '@/components/shell'
import { Sidebar } from '@/components/sidebar'
import { Toc } from '@/components/toc'
import { api, cached, SITE_URL } from '@/lib/apiClient'
import { formatDate, toIsoDate } from '@/lib/date'
import { renderMarkdown } from '@/lib/markdown'

// Next 의 segment config 는 정적 리터럴만 인식한다 (apiClient 의 REVALIDATE_SECONDS 와 같은 값)
export const revalidate = 300

type Params = { slug: string }

/**
 * 빌드 시점에 발행된 글을 미리 만든다. 빌드 중 API 가 닫혀 있으면 빈 배열을 돌려
 * 전부 요청 시 생성으로 넘어간다 — 빌드가 깨지지 않는 쪽을 택했다.
 */
export async function generateStaticParams() {
  try {
    const res = await api.posts.$get({ query: { page: '1', limit: '100' } }, cached(['posts']))
    if (!res.ok) return []
    const { items } = await res.json()
    return items.map((post) => ({ slug: post.slug }))
  } catch {
    return []
  }
}

async function loadPost(slug: string) {
  try {
    const res = await api.posts[':slug'].$get({ param: { slug } }, cached([`post:${slug}`]))
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params
  const data = await loadPost(slug)
  if (!data) return { title: '글을 찾을 수 없습니다' }

  const { post, tags } = data
  const url = `${SITE_URL}/posts/${post.slug}`

  return {
    title: post.title,
    description: post.excerpt,
    keywords: tags,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.excerpt,
      url,
      publishedTime: toIsoDate(post.publishedAt),
      modifiedTime: toIsoDate(post.updatedAt),
      tags,
      // 커버가 없으면 Next 가 opengraph-image 로 자동 생성한 이미지를 쓴다
      ...(post.coverImageUrl ? { images: [{ url: post.coverImageUrl }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
    },
  }
}

export default async function PostPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params
  const data = await loadPost(slug)
  if (!data) notFound()

  const { post, tags, series, prev, next } = data
  const { html, toc } = await renderMarkdown(post.content)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    datePublished: toIsoDate(post.publishedAt),
    dateModified: toIsoDate(post.updatedAt),
    author: { '@type': 'Person', name: 'blogyu' },
    mainEntityOfPage: `${SITE_URL}/posts/${post.slug}`,
    keywords: tags.join(', '),
  }

  return (
    <Shell sidebar={<Sidebar toc={<Toc items={toc} />} />}>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD 구조화 데이터
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="max-w-[44rem]">
        <header className="mb-11 border-border border-b pb-8">
          <p className="tabular mb-[1.1rem] flex flex-wrap gap-2 text-[0.8125rem] text-fg-faint">
            <time dateTime={toIsoDate(post.publishedAt)}>{formatDate(post.publishedAt)}</time>
            <span aria-hidden="true" className="opacity-50">
              ·
            </span>
            <span>{post.readingMinutes}분</span>
          </p>

          <h1 className="mb-[1.1rem] font-bold text-[clamp(2rem,4.2vw,3.125rem)] leading-[1.26] tracking-[-0.008em]">
            {post.title}
          </h1>

          <p className="mb-6 max-w-[40rem] text-[1.125rem] text-fg-muted leading-[1.72]">
            {post.excerpt}
          </p>

          {tags.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <li key={tag}>
                  <Link href={`/tags/${tag}`} className="chip">
                    {tag}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </header>

        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: 본인이 작성한 마크다운을 서버에서 렌더한 HTML */}
        <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />

        {series && (
          <aside className="my-10 rounded-md border border-border bg-bg-subtle px-5 py-[1.1rem]">
            <span className="label mb-3 block">시리즈 · {series.title}</span>
            <ol className="text-[0.875rem]">
              {series.posts.map((item, index) => {
                const isCurrent = item.slug === post.slug
                return (
                  <li key={item.slug} className="flex gap-2.5 py-1">
                    <span
                      aria-hidden="true"
                      className={`tabular shrink-0 pt-0.5 text-[0.8125rem] ${isCurrent ? 'text-accent-ink' : 'text-fg-faint'}`}
                    >
                      {index + 1}.
                    </span>
                    {isCurrent ? (
                      <span aria-current="true" className="font-[560] text-fg">
                        {item.title}
                      </span>
                    ) : (
                      <Link href={`/posts/${item.slug}`} className="text-fg-muted hover:text-fg">
                        {item.title}
                      </Link>
                    )}
                  </li>
                )
              })}
            </ol>
          </aside>
        )}

        <Reactions
          slug={post.slug}
          initialViewCount={post.viewCount}
          initialLikeCount={post.likeCount}
        />

        {(prev || next) && (
          <nav aria-label="이전 다음 글" className="mt-8 grid grid-cols-2 gap-4 max-sm:grid-cols-1">
            {prev ? (
              <Link
                href={`/posts/${prev.slug}`}
                className="rounded-md border border-border px-[1.1rem] py-4 transition-colors hover:border-border-strong hover:bg-bg-subtle"
              >
                <span className="label mb-1.5 block">이전 글</span>
                <span className="block font-[560] text-[0.875rem] leading-[1.55]">
                  {prev.title}
                </span>
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link
                href={`/posts/${next.slug}`}
                className="rounded-md border border-border px-[1.1rem] py-4 text-right transition-colors hover:border-border-strong hover:bg-bg-subtle max-sm:text-left"
              >
                <span className="label mb-1.5 block">다음 글</span>
                <span className="block font-[560] text-[0.875rem] leading-[1.55]">
                  {next.title}
                </span>
              </Link>
            )}
          </nav>
        )}

        <section aria-label="댓글" className="mt-16 border-border border-t pt-8">
          <h2 className="mb-5 text-[0.9375rem]">댓글</h2>
          <Comments />
        </section>
      </article>
    </Shell>
  )
}
