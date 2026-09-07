/**
 * 초안 마크다운 하나를 로컬 DB 에 넣는다. write-loop 가 로컬 확인용으로 쓴다.
 *
 *   pnpm --filter @blogyu/api exec tsx src/db/insertLocal.ts ../../drafts/foo.md
 *
 * 같은 slug 가 있으면 본문을 덮어쓴다. 루프가 회차마다 다시 넣기 때문이다.
 * seed.ts 와 같은 가드를 둔다. 원격 DB 를 가리키면 실행하지 않는다.
 * 앞머리의 title 은 DB 컬럼으로 가고, 본문 첫 줄의 `# 제목` 은 뗀다.
 * 상세 페이지가 h1 을 따로 그리므로 본문에 있으면 두 번 나온다.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { config } from 'dotenv'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { estimateReadingMinutes } from '../lib/text'
import * as schema from './schema'
import { posts, postsToTags, tags } from './schema'

config({ path: '../../.env' })

type Front = {
  title: string
  slug: string
  excerpt: string
  tags: string[]
  coverImageUrl: string | null
}

function parseFrontmatter(text: string): { front: Front; body: string } {
  if (!text.startsWith('---')) throw new Error('앞머리(---)가 없습니다.')
  const end = text.indexOf('\n---', 3)
  if (end === -1) throw new Error('앞머리가 닫히지 않았습니다.')
  const raw = text.slice(3, end)
  let body = text.slice(end + 4).replace(/^\s+/, '')

  const get = (key: string) => {
    const m = raw.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))
    return m?.[1]?.trim().replace(/^["']|["']$/g, '') ?? ''
  }
  const tagLine = get('tags')
  const tagList = tagLine.startsWith('[')
    ? tagLine
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean)
    : []

  // 본문 첫 줄이 H1 이면 뗀다. 제목은 앞머리에서 가져간다.
  body = body.replace(/^#\s+[^\n]*\n+/, '')

  const front = {
    title: get('title'),
    slug: get('slug'),
    excerpt: get('excerpt'),
    tags: tagList,
    coverImageUrl: get('coverImageUrl') || null,
  }
  for (const k of ['title', 'slug', 'excerpt'] as const) {
    if (!front[k]) throw new Error(`앞머리에 ${k} 가 없습니다.`)
  }
  return { front, body }
}

async function main() {
  const file = process.argv[2]
  if (!file) throw new Error('사용: tsx src/db/insertLocal.ts <초안.md>')

  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL 이 없습니다. 루트 .env 를 확인하세요.')
  if (!url.includes('localhost') && !url.includes('localtest.me')) {
    throw new Error('로컬 DB 에서만 실행하세요. 지금 DATABASE_URL 은 원격을 가리킵니다.')
  }

  const { front, body } = parseFrontmatter(readFileSync(resolve(file), 'utf8'))

  const pool = new Pool({ connectionString: url })
  const db = drizzle(pool, { schema, casing: 'snake_case' })

  const [row] = await db
    .insert(posts)
    .values({
      slug: front.slug,
      title: front.title,
      excerpt: front.excerpt,
      content: body,
      coverImageUrl: front.coverImageUrl,
      status: 'published',
      publishedAt: new Date(),
      readingMinutes: estimateReadingMinutes(body),
    })
    .onConflictDoUpdate({
      target: posts.slug,
      set: {
        title: front.title,
        excerpt: front.excerpt,
        content: body,
        coverImageUrl: front.coverImageUrl,
        readingMinutes: estimateReadingMinutes(body),
        updatedAt: new Date(),
      },
    })
    .returning({ id: posts.id })
  if (!row) throw new Error('삽입 실패')

  // 태그는 있으면 재사용, 없으면 만든다. 글의 태그 연결은 매번 새로 맞춘다.
  await db.delete(postsToTags).where(eq(postsToTags.postId, row.id))
  for (const name of front.tags) {
    const [tag] = await db
      .insert(tags)
      .values({ name })
      .onConflictDoNothing()
      .returning({ id: tags.id })
    const id =
      tag?.id ?? (await db.select({ id: tags.id }).from(tags).where(eq(tags.name, name)))[0]?.id
    if (id) await db.insert(postsToTags).values({ postId: row.id, tagId: id })
  }

  console.log(
    `${front.slug} → 로컬 DB. ${estimateReadingMinutes(body)}분, 태그 ${front.tags.length}개`,
  )
  console.log(`http://localhost:3000/posts/${front.slug}`)
  await pool.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
