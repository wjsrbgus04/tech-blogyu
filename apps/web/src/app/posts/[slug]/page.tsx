import type { InferResponseType } from 'hono/client'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Comments } from '@/components/comments'
import { JsonLd } from '@/components/jsonLd'
import { LoadError } from '@/components/loadError'
import { RelativeTime } from '@/components/relativeTime'
import { Shell } from '@/components/shell'
import { Sidebar } from '@/components/sidebar'
import { Toc } from '@/components/toc'
import { ViewCounter } from '@/components/viewCounter'
import { api, cached, SITE_URL } from '@/lib/apiClient'
import { formatDate, toIsoDate } from '@/lib/date'
import { blogPostingLd, breadcrumbLd } from '@/lib/jsonLd'
import { loadOrFail } from '@/lib/loadResult'
import { renderMarkdown } from '@/lib/markdown'
import { markdownUrl, postImageUrl, SITE_LOCALE, SITE_NAME, siteAlternates } from '@/lib/seo'

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

/** 백엔드 라우터에서 200 응답 타입을 그대로 가져온다 */
type PostDetail = InferResponseType<(typeof api.posts)[':slug']['$get'], 200>

function loadPost(slug: string) {
  return loadOrFail<PostDetail>(() =>
    api.posts[':slug'].$get({ param: { slug } }, cached([`post:${slug}`])),
  )
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params
  const result = await loadPost(slug)
  if (!result.ok) return { title: '글을 찾을 수 없습니다' }

  const { post, tags } = result.data
  const url = `${SITE_URL}/posts/${post.slug}`

  return {
    title: post.title,
    description: post.excerpt,
    keywords: tags,
    // 마크다운 원문 주소를 함께 알린다 — AI 크롤러가 렌더된 HTML 대신 이걸 읽는다
    alternates: siteAlternates(`/posts/${post.slug}`, {
      'text/markdown': [{ url: markdownUrl(post.slug), title: post.title }],
    }),
    openGraph: {
      type: 'article',
      // siteName·locale 은 루트에서 상속되지 않는다 — openGraph 를 정의하는 순간
      // 루트의 openGraph 가 통째로 교체되기 때문이다
      siteName: SITE_NAME,
      locale: SITE_LOCALE,
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
  const result = await loadPost(slug)
  // 글이 없는 것과 API 가 죽은 것을 구분한다
  if (!result.ok && result.reason === 'notFound') notFound()
  if (!result.ok) {
    return (
      <Shell sidebar={<Sidebar />}>
        <LoadError label="글" />
      </Shell>
    )
  }

  const { post, tags, series, prev, next } = result.data
  const { html, toc } = await renderMarkdown(post.content)

  const jsonLd = [
    blogPostingLd({
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      coverImageUrl: post.coverImageUrl,
      publishedAt: toIsoDate(post.publishedAt),
      updatedAt: toIsoDate(post.updatedAt),
      tags,
      imageUrl: postImageUrl(post.slug, post.coverImageUrl),
    }),
    breadcrumbLd([
      { name: '홈', path: '/' },
      ...(series ? [{ name: series.title, path: `/series/${series.slug}` }] : []),
      { name: post.title, path: `/posts/${post.slug}` },
    ]),
  ]

  return (
    <Shell sidebar={<Sidebar toc={<Toc items={toc} />} />}>
      <JsonLd data={jsonLd} />

      <article className="max-w-[44rem]">
        <header className="mb-11 border-border border-b pb-8">
          {/* 날짜와 상대 표기만. 읽는 시간은 아래로 내려 둘을 섞지 않는다. */}
          <p className="tabular mb-[1.1rem] flex flex-wrap items-baseline gap-2.5 text-[0.8125rem] text-fg-faint">
            <time dateTime={toIsoDate(post.publishedAt)}>{formatDate(post.publishedAt)}</time>
            <RelativeTime iso={toIsoDate(post.publishedAt) ?? null} />
          </p>

          <h1 className="mb-[1.1rem] font-bold text-[clamp(2rem,4.2vw,3.125rem)] leading-[1.26] tracking-[-0.008em]">
            {post.title}
          </h1>

          <p className="mb-6 max-w-[40rem] text-[1.125rem] text-fg-muted leading-[1.72]">
            {post.excerpt}
          </p>

          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            {tags.length > 0 ? (
              <ul className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <li key={tag}>
                    <Link href={`/tags/${tag}`} className="chip">
                      {tag}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <span />
            )}
            <span className="tabular text-[0.8125rem] text-fg-faint">
              {post.readingMinutes}분 분량
            </span>
          </div>
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

        <ViewCounter slug={post.slug} />

        {/* 크롤러가 글에서 글로 넘어갈 길을 만든다. 사이트맵만으로는 문맥이 안 붙는다. */}
        {(prev || next) && (
          <nav aria-label="다른 글" className="mt-12 flex gap-3 max-sm:flex-col">
            {prev && (
              <Link
                href={`/posts/${prev.slug}`}
                className="group flex-1 rounded-md border border-border px-4 py-3 transition-colors hover:border-border-strong"
              >
                <span className="label mb-1.5 block">이전 글</span>
                <span className="block text-[0.875rem] text-fg-muted leading-snug transition-colors group-hover:text-fg">
                  {prev.title}
                </span>
              </Link>
            )}
            {next && (
              <Link
                href={`/posts/${next.slug}`}
                className="group flex-1 rounded-md border border-border px-4 py-3 text-right transition-colors max-sm:text-left hover:border-border-strong"
              >
                <span className="label mb-1.5 block">다음 글</span>
                <span className="block text-[0.875rem] text-fg-muted leading-snug transition-colors group-hover:text-fg">
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
