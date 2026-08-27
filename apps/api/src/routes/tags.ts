import { and, asc, desc, eq, lte, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { Db } from '../db/client'
import { posts, postsToTags, tags } from '../db/schema'
import type { Bindings } from '../lib/env'

type Env = { Bindings: Bindings; Variables: { db: Db } }

const isPublic = and(eq(posts.status, 'published'), lte(posts.publishedAt, sql`now()`))

export const tagsRoute = new Hono<Env>()

  /** 전체 태그 + 공개 글 수. 글이 없는 태그는 빼고 많은 순으로 준다. */
  .get('/', async (c) => {
    const rows = await c
      .get('db')
      .select({
        name: tags.name,
        count: sql<number>`count(${posts.id})::int`,
      })
      .from(tags)
      .innerJoin(postsToTags, eq(postsToTags.tagId, tags.id))
      .innerJoin(posts, and(eq(posts.id, postsToTags.postId), isPublic))
      .groupBy(tags.name)
      .orderBy(desc(sql`count(${posts.id})`), asc(tags.name))

    return c.json({ items: rows })
  })

  /** 태그 하나의 정보. 글 목록은 /posts?tag= 로 따로 가져간다. */
  .get('/:name', async (c) => {
    const name = c.req.param('name')

    const [row] = await c
      .get('db')
      .select({
        name: tags.name,
        description: tags.description,
        count: sql<number>`count(${posts.id})::int`,
      })
      .from(tags)
      .leftJoin(postsToTags, eq(postsToTags.tagId, tags.id))
      .leftJoin(posts, and(eq(posts.id, postsToTags.postId), isPublic))
      .where(eq(tags.name, name))
      .groupBy(tags.name, tags.description)
      .limit(1)

    if (!row) throw new HTTPException(404, { message: '태그를 찾을 수 없습니다.' })
    return c.json(row)
  })
