/**
 * 개발용 시드. 빈 화면으로는 목록 간격도 코드 블록도 확인할 수 없어서
 * 실제 글에 가까운 데이터를 넣는다.
 *
 *   pnpm db:seed
 *
 * 기존 데이터를 지우고 다시 넣으므로 개발 DB 에서만 쓴다.
 */
import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { estimateReadingMinutes } from '../lib/text'
import * as schema from './schema'
import { postLikes, posts, postsToTags, series, tags } from './schema'

config({ path: '../../.env' })

const SERIES = {
  slug: 'free-tier-blog',
  title: '무료 티어로 블로그 만들기',
  description: '한 푼도 안 쓰고 기술 블로그를 굴리기까지 겪은 일들.',
}

type SeedPost = {
  slug: string
  title: string
  excerpt: string
  content: string
  tags: string[]
  daysAgo: number
  status: 'draft' | 'published'
  viewCount: number
  likeCount: number
  seriesOrder?: number
}

const POSTS: SeedPost[] = [
  {
    slug: 'edge-postgres-connection',
    title: 'Cloudflare Workers에서 Postgres 연결 최적화하기',
    excerpt:
      '엣지 런타임에는 TCP 커넥션 풀이 없습니다. HTTP 드라이버로 갈아타면서 측정한 지연 시간과, 그 과정에서 알게 된 제약을 정리했습니다.',
    tags: ['cloudflare', 'postgres', 'edge'],
    daysAgo: 7,
    status: 'published',
    viewCount: 1240,
    likeCount: 37,
    seriesOrder: 2,
    content: `## 엣지 런타임의 커넥션 문제

Workers는 요청마다 격리된 컨텍스트에서 실행됩니다. 프로세스가 살아 있는 동안 커넥션을 재사용하는 전통적인 풀링 전략이 통하지 않는다는 뜻입니다. 매 요청 TCP 핸드셰이크를 새로 하면 왕복 지연이 그대로 응답 시간에 얹힙니다.

> 엣지에서는 "연결을 오래 붙잡는" 최적화가 아니라 "연결을 아예 만들지 않는" 최적화가 필요합니다.

처음에는 \`pg\` 드라이버를 그대로 올려봤습니다. 로컬에서는 멀쩡했지만 배포하자마자 \`Too many connections\`가 쏟아졌습니다. 격리 컨텍스트마다 새 커넥션을 열고 있었으니 당연한 결과입니다.

## HTTP 드라이버로 전환

Neon은 Postgres 와이어 프로토콜을 HTTP로 감싼 서버리스 드라이버를 제공합니다. 커넥션이라는 개념 자체가 사라져 Workers와 궁합이 맞습니다.

### Drizzle 설정

\`\`\`ts
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'

// 요청마다 새로 만들어도 비용이 없다 — 연결이 아니라 fetch다
export const createDb = (url: string) =>
  drizzle(neon(url), { schema })
\`\`\`

### 지연 시간 측정

도쿄 리전에서 1,000회씩 측정했습니다. 차이는 예상보다 컸습니다.

| 방식 | p50 | p95 |
| --- | --- | --- |
| TCP 직접 연결 | 182ms | 410ms |
| HTTP 드라이버 | 41ms | 96ms |

## 남은 제약

공짜는 아닙니다. HTTP 드라이버에는 두 가지 제약이 따라옵니다.

- 트랜잭션은 **단일 HTTP 요청 안에서만** 묶을 수 있습니다.
- 커서 기반 스트리밍은 지원되지 않습니다.

블로그처럼 읽기가 대부분인 워크로드에서는 둘 다 실질적인 문제가 되지 않았습니다. 쓰기가 많고 긴 트랜잭션이 필요한 서비스라면 Hyperdrive 쪽을 먼저 검토하는 편이 낫습니다.`,
  },
  {
    slug: 'hono-rpc-types',
    title: 'Hono RPC로 프론트엔드까지 타입 전달하기',
    excerpt:
      '백엔드 라우터의 타입을 그대로 export 해서 프론트엔드 fetch 응답까지 추론시키는 방법. 스키마를 두 번 쓰지 않아도 됩니다.',
    tags: ['hono', 'typescript'],
    daysAgo: 15,
    status: 'published',
    viewCount: 860,
    likeCount: 21,
    content: `## 스키마를 두 번 쓰는 문제

REST API를 쓰면 응답 타입을 백엔드에 한 번, 프론트엔드에 한 번 적게 됩니다. 둘이 어긋나도 컴파일러는 아무 말이 없습니다. 런타임에 \`undefined\`를 만나고서야 알게 됩니다.

## 라우터 타입 export

Hono는 라우터를 체이닝하면 타입이 누적됩니다. 그 타입을 그대로 내보내면 됩니다.

\`\`\`ts
const routes = app
  .get('/posts', handler)
  .get('/posts/:slug', handler)

export type AppType = typeof routes
\`\`\`

프론트엔드에서는 이렇게 받습니다.

\`\`\`ts
import { hc } from 'hono/client'
import type { AppType } from '@blogyu/api'

const api = hc<AppType>(API_URL)
const res = await api.posts[':slug'].$get({ param: { slug } })
const data = await res.json()
//    ^? 응답 타입이 자동으로 추론된다
\`\`\`

## 모노레포에서 주의할 점

web이 api의 **소스**를 직접 읽게 두면 Workers 전역 타입이 DOM 타입과 충돌합니다. \`.d.ts\`만 노출하도록 분리해야 합니다.`,
  },
  {
    slug: 'next16-cache-components',
    title: 'Next.js 16 Cache Components 실전 적용기',
    excerpt:
      '목록과 상세에 Cache Components를 붙이면서 어디까지 정적으로 남길 수 있는지 실험했습니다. 조회수 같은 동적 요소와의 경계가 핵심이었습니다.',
    tags: ['nextjs', 'react'],
    daysAgo: 24,
    status: 'published',
    viewCount: 2105,
    likeCount: 64,
    content: `## 정적과 동적의 경계

블로그 글은 거의 바뀌지 않습니다. 그런데 조회수는 매번 바뀝니다. 한 페이지 안에 성격이 다른 두 데이터가 섞여 있습니다.

전통적으로는 둘 중 하나를 포기했습니다. 페이지 전체를 동적으로 만들거나, 조회수를 클라이언트에서 따로 가져오거나.

## 경계를 나누는 기준

이 블로그에서는 이렇게 정리했습니다.

- **본문·제목·태그** — ISR로 캐시. 발행할 때만 무효화한다.
- **조회수·좋아요** — 클라이언트에서 마운트 후 가져온다.

결과적으로 첫 페인트가 정적 HTML로 나가고, 숫자만 나중에 채워집니다.`,
  },
  {
    slug: 'drizzle-ci-migration',
    title: 'Drizzle 마이그레이션을 CI에 붙이면서 겪은 일',
    excerpt:
      '스키마 변경을 PR 단계에서 검증하고 배포 시 자동 적용하기까지. 롤백 전략이 없으면 결국 손으로 고치게 됩니다.',
    tags: ['drizzle', 'ci', 'postgres'],
    daysAgo: 33,
    status: 'published',
    viewCount: 540,
    likeCount: 12,
    content: `## 자동 적용의 함정

CI에서 \`drizzle-kit migrate\`를 돌리는 건 쉽습니다. 문제는 실패했을 때입니다.

마이그레이션이 절반만 적용된 채 죽으면, 스키마는 코드와 어긋나 있고 배포는 이미 나가 있습니다. 롤백 스크립트가 없으면 손으로 고치는 수밖에 없습니다.

## 지금 쓰는 방식

결국 자동 적용을 포기했습니다.

1. 로컬에서 \`pnpm db:migrate\`를 돌린다
2. 문제없으면 푸시한다
3. CI는 배포만 한다

느리지만 되돌릴 수 없는 작업을 사람이 확인하고 넘긴다는 점이 중요합니다.`,
  },
  {
    slug: 'pnpm-shared-types',
    title: 'pnpm workspace에서 타입 공유 패키지 설계',
    excerpt:
      '프론트·백엔드가 함께 쓰는 타입을 어느 패키지에 두고 어떻게 빌드할지. 빌드 없이 소스를 직접 참조하는 쪽이 개발 속도에 유리했습니다.',
    tags: ['pnpm', 'monorepo', 'typescript'],
    daysAgo: 44,
    status: 'draft',
    viewCount: 0,
    likeCount: 0,
    content: `## 소스 참조 vs 빌드 산출물 참조

워크스페이스 패키지를 참조하는 방법은 두 가지입니다.

- \`exports\`가 \`.ts\` 소스를 가리키게 한다 — 빌드가 필요 없어 빠르다
- \`.d.ts\`를 만들어 그걸 가리킨다 — 빌드가 선행되어야 한다

전자가 편하지만, 런타임 환경이 다른 패키지끼리는 전역 타입이 충돌합니다.`,
  },
  {
    slug: 'isr-webhook-revalidate',
    title: 'ISR 재검증을 웹훅으로 트리거하기',
    excerpt:
      '어드민에서 글을 발행하면 해당 경로만 즉시 갱신되도록. 전체 재빌드 없이 몇 초 안에 반영됩니다.',
    tags: ['nextjs', 'vercel'],
    daysAgo: 52,
    status: 'draft',
    viewCount: 0,
    likeCount: 0,
    seriesOrder: 3,
    content: `## 발행하고 나서 기다리는 시간

ISR의 \`revalidate: 300\`은 "최대 5분까지는 옛날 글이 보인다"는 뜻입니다. 오타를 고치고 5분을 기다리는 건 답답합니다.

## 웹훅으로 즉시 무효화

API가 글을 저장한 뒤 Next의 재검증 엔드포인트를 부릅니다.

\`\`\`ts
await fetch(\`\${SITE_URL}/api/revalidate\`, {
  method: 'POST',
  headers: { 'x-revalidate-secret': secret },
  body: JSON.stringify({ paths: ['/', \`/posts/\${slug}\`] }),
})
\`\`\`

재검증이 실패해도 글 저장은 이미 끝났습니다. 다음 주기에 어차피 갱신되므로 실패는 삼킵니다.`,
  },
]

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL 이 없습니다. 루트 .env 를 확인하세요.')
  if (!url.includes('localhost') && !url.includes('localtest.me')) {
    throw new Error('시드는 로컬 DB 에서만 실행하세요. 지금 DATABASE_URL 은 원격을 가리킵니다.')
  }

  const pool = new Pool({ connectionString: url })
  const db = drizzle(pool, { schema, casing: 'snake_case' })

  console.log('기존 데이터 삭제…')
  await db.delete(postLikes)
  await db.delete(postsToTags)
  await db.delete(posts)
  await db.delete(tags)
  await db.delete(series)

  const [createdSeries] = await db.insert(series).values(SERIES).returning({ id: series.id })
  if (!createdSeries) throw new Error('시리즈 생성 실패')

  const tagNames = [...new Set(POSTS.flatMap((post) => post.tags))]
  const createdTags = await db
    .insert(tags)
    .values(tagNames.map((name) => ({ name })))
    .returning({ id: tags.id, name: tags.name })

  const tagId = new Map(createdTags.map((tag) => [tag.name, tag.id]))

  for (const post of POSTS) {
    const publishedAt = new Date(Date.now() - post.daysAgo * 24 * 60 * 60 * 1000)

    const [created] = await db
      .insert(posts)
      .values({
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
        status: post.status,
        publishedAt: post.status === 'published' ? publishedAt : null,
        readingMinutes: estimateReadingMinutes(post.content),
        viewCount: post.viewCount,
        likeCount: post.likeCount,
        seriesId: post.seriesOrder ? createdSeries.id : null,
        seriesOrder: post.seriesOrder ?? null,
      })
      .returning({ id: posts.id })

    if (!created) continue

    await db.insert(postsToTags).values(
      post.tags
        .map((name) => tagId.get(name))
        .filter((id): id is string => Boolean(id))
        .map((id) => ({ postId: created.id, tagId: id })),
    )
  }

  const published = POSTS.filter((post) => post.status === 'published').length
  console.log(`글 ${POSTS.length}편 (발행 ${published}) · 태그 ${tagNames.length}개 · 시리즈 1개`)

  await pool.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
