import { zValidator } from '@hono/zod-validator'
import { and, desc, or, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import type { Db } from '../db/client'
import { isPublicPost as isPublic } from '../db/filters'
import { posts } from '../db/schema'
import type { Bindings } from '../lib/env'
import { searchQuerySchema } from '../lib/schemas'
import { validationHook } from '../lib/validate'

type Env = { Bindings: Bindings; Variables: { db: Db } }

/**
 * 제목·요약·본문을 ILIKE 로 훑는다.
 *
 * Postgres 전문 검색(tsvector)은 한국어 형태소 분석기가 기본 제공되지 않아
 * "커넥션" 같은 검색어가 "커넥션을"에 걸리지 않는다. 부분 문자열 매칭인 ILIKE 가
 * 오히려 한국어에 맞고, pg_trgm GIN 인덱스를 걸어두면 속도도 실용 범위에 든다.
 * 글이 수천 편을 넘어가면 그때 외부 검색 엔진을 검토한다.
 */
export const searchRoute = new Hono<Env>().get(
  '/',
  zValidator('query', searchQuerySchema, validationHook),
  async (c) => {
    const { q, limit } = c.req.valid('query')
    // ILIKE 와일드카드로 해석되는 문자를 이스케이프한다
    const pattern = `%${q.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`

    const rows = await c
      .get('db')
      .select({
        slug: posts.slug,
        title: posts.title,
        excerpt: posts.excerpt,
        publishedAt: posts.publishedAt,
        readingMinutes: posts.readingMinutes,
      })
      .from(posts)
      .where(
        and(
          isPublic,
          or(
            sql`${posts.title} ilike ${pattern}`,
            sql`${posts.excerpt} ilike ${pattern}`,
            sql`${posts.content} ilike ${pattern}`,
          ),
        ),
      )
      // 제목에 걸린 글을 먼저 보여준다
      .orderBy(sql`(${posts.title} ilike ${pattern}) desc`, desc(posts.publishedAt))
      .limit(limit)

    return c.json({ query: q, items: rows, total: rows.length })
  },
)
