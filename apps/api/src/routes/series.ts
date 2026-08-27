import { and, desc, eq, lte, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { Db } from '../db/client'
import { posts, series } from '../db/schema'
import type { Bindings } from '../lib/env'

type Env = { Bindings: Bindings; Variables: { db: Db } }

const isPublic = and(eq(posts.status, 'published'), lte(posts.publishedAt, sql`now()`))

export const seriesRoute = new Hono<Env>()

  /** 사이드바가 쓰는 목록. 공개 글이 하나도 없는 시리즈는 빼고 최신순으로 준다. */
  .get('/', async (c) => {
    const rows = await c
      .get('db')
      .select({
        slug: series.slug,
        title: series.title,
        count: sql<number>`count(${posts.id})::int`,
      })
      .from(series)
      .innerJoin(posts, and(eq(posts.seriesId, series.id), isPublic))
      .groupBy(series.slug, series.title, series.createdAt)
      .orderBy(desc(series.createdAt))

    return c.json({ items: rows })
  })

  .get('/:slug', async (c) => {
    const slug = c.req.param('slug')

    const [row] = await c
      .get('db')
      .select({
        slug: series.slug,
        title: series.title,
        description: series.description,
        count: sql<number>`count(${posts.id})::int`,
      })
      .from(series)
      .leftJoin(posts, and(eq(posts.seriesId, series.id), isPublic))
      .where(eq(series.slug, slug))
      .groupBy(series.slug, series.title, series.description)
      .limit(1)

    if (!row) throw new HTTPException(404, { message: '시리즈를 찾을 수 없습니다.' })
    return c.json(row)
  })
