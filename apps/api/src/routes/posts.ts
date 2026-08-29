import { zValidator } from '@hono/zod-validator'
import { and, asc, desc, eq, inArray, lte, ne, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { Db } from '../db/client'
import { isPublicPost as isPublic } from '../db/filters'
import { postLikes, posts, postsToTags, series, tags } from '../db/schema'
import type { Bindings } from '../lib/env'
import { listQuerySchema, slugParamSchema } from '../lib/schemas'
import { hashVisitor } from '../lib/text'
import { validationHook } from '../lib/validate'

type Env = { Bindings: Bindings; Variables: { db: Db } }

/** 글 여러 건의 태그를 한 번에 가져와 id 별로 묶는다 (N+1 방지). */
async function loadTagsByPost(db: Db, postIds: string[]): Promise<Map<string, string[]>> {
  const grouped = new Map<string, string[]>()
  if (postIds.length === 0) return grouped

  const rows = await db
    .select({ postId: postsToTags.postId, name: tags.name })
    .from(postsToTags)
    .innerJoin(tags, eq(tags.id, postsToTags.tagId))
    .where(inArray(postsToTags.postId, postIds))
    .orderBy(asc(tags.name))

  for (const row of rows) {
    const list = grouped.get(row.postId) ?? []
    list.push(row.name)
    grouped.set(row.postId, list)
  }
  return grouped
}

export const postsRoute = new Hono<Env>()

  /** 목록 — 태그·시리즈로 걸러 최신순. */
  .get('/', zValidator('query', listQuerySchema, validationHook), async (c) => {
    const { page, limit, tag, series: seriesSlug } = c.req.valid('query')
    const db = c.get('db')
    const offset = (page - 1) * limit

    const filters = [isPublic]

    if (tag) {
      const matched = db
        .select({ postId: postsToTags.postId })
        .from(postsToTags)
        .innerJoin(tags, eq(tags.id, postsToTags.tagId))
        .where(eq(tags.name, tag))
      filters.push(inArray(posts.id, matched))
    }

    if (seriesSlug) {
      const matched = db.select({ id: series.id }).from(series).where(eq(series.slug, seriesSlug))
      filters.push(inArray(posts.seriesId, matched))
    }

    const where = and(...filters)

    const [rows, [counted]] = await Promise.all([
      db
        .select({
          slug: posts.slug,
          title: posts.title,
          excerpt: posts.excerpt,
          coverImageUrl: posts.coverImageUrl,
          publishedAt: posts.publishedAt,
          // 사이트맵의 lastmod 가 쓴다 — 발행일만으로는 글을 고쳐도 재크롤 신호가 안 간다
          updatedAt: posts.updatedAt,
          readingMinutes: posts.readingMinutes,
          id: posts.id,
        })
        .from(posts)
        .where(where)
        // 시리즈를 볼 때는 편 순서가 맞다. 그 외에는 최신순.
        .orderBy(seriesSlug ? asc(posts.seriesOrder) : desc(posts.publishedAt))
        .limit(limit)
        .offset(offset),
      db.select({ value: sql<number>`count(*)::int` }).from(posts).where(where),
    ])

    const tagsByPost = await loadTagsByPost(
      db,
      rows.map((row) => row.id),
    )
    const total = counted?.value ?? 0

    return c.json({
      items: rows.map(({ id, ...rest }) => ({ ...rest, tags: tagsByPost.get(id) ?? [] })),
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    })
  })

  /** 상세 — 본문, 태그, 시리즈, 이전/다음 글을 한 번에 준다. */
  .get('/:slug', zValidator('param', slugParamSchema, validationHook), async (c) => {
    const { slug } = c.req.valid('param')
    const db = c.get('db')

    const [post] = await db
      .select()
      .from(posts)
      .where(and(eq(posts.slug, slug), isPublic))
      .limit(1)

    if (!post) {
      throw new HTTPException(404, { message: '글을 찾을 수 없습니다.' })
    }

    const [postTags, seriesInfo, adjacent] = await Promise.all([
      db
        .select({ name: tags.name })
        .from(postsToTags)
        .innerJoin(tags, eq(tags.id, postsToTags.tagId))
        .where(eq(postsToTags.postId, post.id))
        .orderBy(asc(tags.name)),

      post.seriesId
        ? db
            .select({
              slug: series.slug,
              title: series.title,
              posts: sql<
                { slug: string; title: string; order: number | null }[]
              >`coalesce(json_agg(json_build_object('slug', ${posts.slug}, 'title', ${posts.title}, 'order', ${posts.seriesOrder}) order by ${posts.seriesOrder}), '[]')`,
            })
            .from(series)
            .innerJoin(posts, and(eq(posts.seriesId, series.id), isPublic))
            .where(eq(series.id, post.seriesId))
            .groupBy(series.slug, series.title)
            .then((rows) => rows[0] ?? null)
        : Promise.resolve(null),

      Promise.all([
        db
          .select({ slug: posts.slug, title: posts.title })
          .from(posts)
          .where(
            and(
              isPublic,
              ne(posts.id, post.id),
              lte(posts.publishedAt, post.publishedAt ?? new Date()),
            ),
          )
          .orderBy(desc(posts.publishedAt))
          .limit(1),
        db
          .select({ slug: posts.slug, title: posts.title })
          .from(posts)
          .where(
            and(
              isPublic,
              ne(posts.id, post.id),
              sql`${posts.publishedAt} >= ${post.publishedAt ?? new Date()}`,
            ),
          )
          .orderBy(asc(posts.publishedAt))
          .limit(1),
      ]),
    ])

    const [prevRows, nextRows] = adjacent

    return c.json({
      post: {
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
        coverImageUrl: post.coverImageUrl,
        publishedAt: post.publishedAt,
        updatedAt: post.updatedAt,
        readingMinutes: post.readingMinutes,
        viewCount: post.viewCount,
        likeCount: post.likeCount,
      },
      tags: postTags.map((row) => row.name),
      series: seriesInfo,
      prev: prevRows[0] ?? null,
      next: nextRows[0] ?? null,
    })
  })

  /**
   * 조회수 +1. 중복 방지는 클라이언트가 sessionStorage 로 한 번만 호출해서 처리한다.
   * 정확한 통계가 목적이 아니라 "많이 읽힌 글"을 구분하는 게 목적이라 이 정도면 충분하다.
   */
  .post('/:slug/view', zValidator('param', slugParamSchema, validationHook), async (c) => {
    const { slug } = c.req.valid('param')
    const [updated] = await c
      .get('db')
      .update(posts)
      .set({ viewCount: sql`${posts.viewCount} + 1` })
      .where(and(eq(posts.slug, slug), isPublic))
      .returning({ viewCount: posts.viewCount })

    if (!updated) throw new HTTPException(404, { message: '글을 찾을 수 없습니다.' })
    return c.json(updated)
  })

  /** 좋아요 토글. 방문자 해시로 중복을 막는다. */
  .post('/:slug/like', zValidator('param', slugParamSchema, validationHook), async (c) => {
    const { slug } = c.req.valid('param')
    const db = c.get('db')

    const [post] = await db
      .select({ id: posts.id })
      .from(posts)
      .where(and(eq(posts.slug, slug), isPublic))
      .limit(1)

    if (!post) throw new HTTPException(404, { message: '글을 찾을 수 없습니다.' })

    const visitor = await hashVisitor(
      c.req.header('CF-Connecting-IP') ?? '0.0.0.0',
      c.req.header('User-Agent') ?? 'unknown',
      c.env.AUTH_SECRET,
    )

    const removed = await db
      .delete(postLikes)
      .where(and(eq(postLikes.postId, post.id), eq(postLikes.visitorHash, visitor)))
      .returning({ postId: postLikes.postId })

    const liked = removed.length === 0
    if (liked) {
      await db.insert(postLikes).values({ postId: post.id, visitorHash: visitor })
    }

    const [updated] = await db
      .update(posts)
      .set({ likeCount: sql`greatest(0, ${posts.likeCount} + ${liked ? 1 : -1})` })
      .where(eq(posts.id, post.id))
      .returning({ likeCount: posts.likeCount })

    return c.json({ liked, likeCount: updated?.likeCount ?? 0 })
  })
