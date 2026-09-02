import type { InferResponseType } from 'hono/client'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Comments } from '@/components/comments'
import { LoadError } from '@/components/loadError'
import { RelativeTime } from '@/components/relativeTime'
import { Shell } from '@/components/shell'
import { Toc } from '@/components/toc'
import { ViewCounter } from '@/components/viewCounter'
import { api, cached, SITE_URL } from '@/lib/apiClient'
import { formatDateLong, toIsoDate } from '@/lib/date'
import { loadOrFail } from '@/lib/loadResult'
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
  const result = await loadPost(slug)
  // 글이 없는 것과 API 가 죽은 것을 구분한다
  if (!result.ok && result.reason === 'notFound') notFound()
  if (!result.ok) {
    return (
      <Shell>
        <LoadError label="글" />
      </Shell>
    )
  }

  const { post, tags, series } = result.data
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
    // 헤딩이 없는 글은 레일 없이 한 단으로 — 빈 레일이 본문 폭만 잡아먹는다
    <Shell aside={toc.length > 0 ? <Toc items={toc} /> : undefined}>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD 구조화 데이터
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="max-w-[46rem]">
        <header className="mb-12">
          {/* 커버는 히어로처럼 16:7 로 꽉 채운다. 자동 생성 OG 는 제목이 겹치므로 여기선 안 쓴다 */}
          {post.coverImageUrl && (
            // biome-ignore lint/performance/noImgElement: R2 원본을 그대로 쓴다
            <img
              src={post.coverImageUrl}
              alt=""
              width={1200}
              height={525}
              className="mb-6 aspect-[16/7] w-full object-cover"
              fetchPriority="high"
            />
          )}

          {/* 날짜와 상대 표기만. 읽는 시간은 아래로 내려 둘을 섞지 않는다. */}
          <p className="mb-5 flex flex-wrap items-baseline gap-2.5 text-caption">
            <time dateTime={toIsoDate(post.publishedAt)}>{formatDateLong(post.publishedAt)}</time>
            <RelativeTime iso={toIsoDate(post.publishedAt) ?? null} />
          </p>

          <h1 className="mb-5 text-display font-semibold">{post.title}</h1>

          <p className="mb-6 text-body-lg">{post.excerpt}</p>

          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-caption">
            {tags.length > 0 ? (
              <ul className="flex flex-wrap gap-x-4 gap-y-2">
                {tags.map((tag) => (
                  <li key={tag}>
                    <Link href={`/tags/${tag}`} className="ink-link">
                      {tag}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <span />
            )}
            <span className="tabular text-fg-faint">{post.readingMinutes}분 분량</span>
          </div>
        </header>

        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: 본인이 작성한 마크다운을 서버에서 렌더한 HTML */}
        <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />

        {series && (
          <aside className="my-12 border-border border-y py-6">
            <span className="label mb-4 block">시리즈 · {series.title}</span>
            <ol className="text-body">
              {series.posts.map((item, index) => {
                const isCurrent = item.slug === post.slug
                return (
                  <li key={item.slug} className="flex gap-3 py-1.5">
                    <span
                      aria-hidden="true"
                      className={`tabular shrink-0 ${isCurrent ? 'text-accent' : 'text-fg-faint'}`}
                    >
                      {index + 1}.
                    </span>
                    {isCurrent ? (
                      <span aria-current="true" className="font-semibold">
                        {item.title}
                      </span>
                    ) : (
                      <Link href={`/posts/${item.slug}`} className="title-link">
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

        <section aria-label="댓글" className="mt-16 border-border border-t pt-8">
          <h2 className="mb-5 text-subheading font-semibold">댓글</h2>
          <Comments />
        </section>
      </article>
    </Shell>
  )
}
