import { zValidator } from '@hono/zod-validator'
import { and, desc, eq, inArray, lte, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { requireAdmin } from '../auth/session'
import type { Db } from '../db/client'
import { posts, postsToTags, series, tags } from '../db/schema'
import { cacheTags } from '../lib/cacheTags'
import type { AdminUser, Bindings } from '../lib/env'
import { PG_UNIQUE_VIOLATION, pgConstraint, pgErrorCode } from '../lib/errors'
import {
  adminListQuerySchema,
  idParamSchema,
  postInputSchema,
  postPatchSchema,
  seriesInputSchema,
  seriesPatchSchema,
} from '../lib/schemas'
import { estimateReadingMinutes } from '../lib/text'
import { validationHook } from '../lib/validate'

type Env = { Bindings: Bindings; Variables: { db: Db; admin: AdminUser } }

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024 // 8MB
const ALLOWED_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/avif',
])

/**
 * 글이 바뀌면 해당 경로를 즉시 갱신한다. 전체 재빌드 없이 몇 초 안에 반영된다.
 * 경로와 함께 fetch 캐시 태그도 비운다 — 경로만 비우면 사이트맵·RSS·llms.txt 처럼
 * 같은 목록을 읽는 다른 산출물이 캐시 주기(최대 1시간)가 끝날 때까지 옛 내용을 낸다.
 * 재검증 실패가 글 저장을 되돌리면 안 되므로 실패는 삼킨다.
 */
async function revalidate(env: Bindings, paths: string[]): Promise<void> {
  if (!env.REVALIDATE_SECRET) return
  try {
    await fetch(`${env.SITE_URL}/api/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-revalidate-secret': env.REVALIDATE_SECRET,
      },
      body: JSON.stringify({ paths, tags: cacheTags(paths) }),
    })
  } catch {
    // 웹훅이 죽어도 글은 이미 저장됐다. 다음 ISR 주기에 어차피 갱신된다.
  }
}

/** 태그 이름 배열을 받아 없는 건 만들고, 글의 태그 연결을 통째로 교체한다. */
async function syncTags(db: Db, postId: string, names: string[]): Promise<void> {
  await db.delete(postsToTags).where(eq(postsToTags.postId, postId))
  if (names.length === 0) return

  const unique = [...new Set(names.map((name) => name.trim().toLowerCase()).filter(Boolean))]

  await db
    .insert(tags)
    .values(unique.map((name) => ({ name })))
    .onConflictDoNothing({ target: tags.name })

  const rows = await db.select({ id: tags.id }).from(tags).where(inArray(tags.name, unique))

  await db.insert(postsToTags).values(rows.map((row) => ({ postId, tagId: row.id })))
}

/** 시리즈에 속한 글 상세 경로. 시리즈 정보가 바뀌면 이 페이지들도 다시 그려야 한다. */
async function seriesPostPaths(db: Db, seriesId: string): Promise<string[]> {
  const rows = await db.select({ slug: posts.slug }).from(posts).where(eq(posts.seriesId, seriesId))
  return rows.map((row) => `/posts/${row.slug}`)
}

/**
 * 슬러그가 겹치면 Postgres 가 unique 제약 위반을 던진다.
 * 그대로 두면 500 "서버 오류"가 나가서, 고칠 수 있는 문제인데도
 * 사용자는 자기 입력이 잘못된 줄 모른다. 409 로 바꿔 이유를 알려준다.
 */
function rethrowAsConflict(error: unknown): never {
  if (pgErrorCode(error) === PG_UNIQUE_VIOLATION && pgConstraint(error)?.includes('slug')) {
    throw new HTTPException(409, {
      message: '이미 쓰이고 있는 주소입니다. 슬러그를 다르게 지어주세요.',
    })
  }
  throw error
}

/**
 * 예약은 미래 시각이 있어야 성립한다.
 * 시각이 없거나 이미 지났으면 resolvePublishedAt 이 지금 시각을 채워
 * 즉시 공개돼 버린다 — 예약한 사람의 의도와 정반대다.
 * 화면에서도 막지만 서버가 마지막 관문이다.
 */
function assertSchedulable(status: 'draft' | 'published' | 'scheduled', publishedAt: Date | null) {
  if (status !== 'scheduled') return
  if (!publishedAt || publishedAt <= new Date()) {
    throw new HTTPException(400, {
      message: '예약하려면 지금보다 뒤의 발행 시각을 지정해야 합니다.',
    })
  }
}

/** 발행 상태에 따라 publishedAt 을 정한다. 예약이면 입력값을 그대로 쓴다. */
function resolvePublishedAt(
  status: 'draft' | 'published' | 'scheduled',
  input: string | null | undefined,
  current: Date | null,
): Date | null {
  if (status === 'draft') return current
  if (input) return new Date(input)
  return current ?? new Date()
}

export const adminRoute = new Hono<Env>()
  .use('*', requireAdmin)

  /** 어드민 목록 — 임시저장까지 전부 보여준다. */
  .get('/posts', zValidator('query', adminListQuerySchema, validationHook), async (c) => {
    const { status, page, limit } = c.req.valid('query')
    const db = c.get('db')

    /**
     * 예약 시각이 지난 글은 독자에게 이미 공개돼 있다. 그런데 status 는
     * 'scheduled' 그대로라 목록에서 "예약 2편"처럼 세어져 실제와 어긋난다.
     * 크론을 두는 대신 어드민을 열 때 스스로 맞춘다 — 대상이 없으면
     * 아무 행도 건드리지 않으므로 매번 돌아도 부담이 없다.
     * updatedAt 은 손대지 않는다. 정렬이 흔들리면 안 된다.
     */
    await db
      .update(posts)
      .set({ status: 'published' })
      .where(and(eq(posts.status, 'scheduled'), lte(posts.publishedAt, sql`now()`)))

    const where = status === 'all' ? undefined : eq(posts.status, status)

    const [rows, [counted]] = await Promise.all([
      db
        .select({
          id: posts.id,
          slug: posts.slug,
          title: posts.title,
          status: posts.status,
          publishedAt: posts.publishedAt,
          updatedAt: posts.updatedAt,
          viewCount: posts.viewCount,
          likeCount: posts.likeCount,
        })
        .from(posts)
        .where(where)
        .orderBy(desc(posts.updatedAt))
        .limit(limit)
        .offset((page - 1) * limit),
      db.select({ value: sql<number>`count(*)::int` }).from(posts).where(where),
    ])

    const counts = await db
      .select({ status: posts.status, value: sql<number>`count(*)::int` })
      .from(posts)
      .groupBy(posts.status)

    return c.json({
      items: rows,
      total: counted?.value ?? 0,
      counts: Object.fromEntries(counts.map((row) => [row.status, row.value])),
    })
  })

  /** 편집 화면이 여는 단건 — 임시저장도 읽을 수 있어야 한다. */
  .get('/posts/:id', zValidator('param', idParamSchema, validationHook), async (c) => {
    const { id } = c.req.valid('param')
    const db = c.get('db')

    const [post] = await db.select().from(posts).where(eq(posts.id, id)).limit(1)
    if (!post) throw new HTTPException(404, { message: '글을 찾을 수 없습니다.' })

    const postTags = await db
      .select({ name: tags.name })
      .from(postsToTags)
      .innerJoin(tags, eq(tags.id, postsToTags.tagId))
      .where(eq(postsToTags.postId, id))

    return c.json({ post, tags: postTags.map((row) => row.name) })
  })

  .post('/posts', zValidator('json', postInputSchema, validationHook), async (c) => {
    const input = c.req.valid('json')
    const db = c.get('db')

    assertSchedulable(input.status, input.publishedAt ? new Date(input.publishedAt) : null)

    const [created] = await db
      .insert(posts)
      .values({
        slug: input.slug,
        title: input.title,
        excerpt: input.excerpt,
        content: input.content,
        coverImageUrl: input.coverImageUrl ?? null,
        status: input.status,
        publishedAt: resolvePublishedAt(input.status, input.publishedAt, null),
        readingMinutes: estimateReadingMinutes(input.content),
        seriesId: input.seriesId ?? null,
        seriesOrder: input.seriesOrder ?? null,
      })
      .returning({ id: posts.id, slug: posts.slug })
      .catch(rethrowAsConflict)

    if (!created) throw new HTTPException(500, { message: '글 저장에 실패했습니다.' })

    await syncTags(db, created.id, input.tags)
    c.executionCtx.waitUntil(revalidate(c.env, ['/', `/posts/${created.slug}`]))

    return c.json(created, 201)
  })

  .patch(
    '/posts/:id',
    zValidator('param', idParamSchema, validationHook),
    zValidator('json', postPatchSchema, validationHook),
    async (c) => {
      const { id } = c.req.valid('param')
      const input = c.req.valid('json')
      const db = c.get('db')

      const [existing] = await db
        .select({ slug: posts.slug, status: posts.status, publishedAt: posts.publishedAt })
        .from(posts)
        .where(eq(posts.id, id))
        .limit(1)

      if (!existing) throw new HTTPException(404, { message: '글을 찾을 수 없습니다.' })

      const status = input.status ?? existing.status
      // status 만 바꾸고 시각은 그대로 둔 요청도 있으므로 병합 결과로 본다
      const nextPublishedAt = resolvePublishedAt(status, input.publishedAt, existing.publishedAt)
      assertSchedulable(status, nextPublishedAt)

      const [updated] = await db
        .update(posts)
        .set({
          ...(input.slug !== undefined && { slug: input.slug }),
          ...(input.title !== undefined && { title: input.title }),
          ...(input.excerpt !== undefined && { excerpt: input.excerpt }),
          ...(input.content !== undefined && {
            content: input.content,
            readingMinutes: estimateReadingMinutes(input.content),
          }),
          ...(input.coverImageUrl !== undefined && { coverImageUrl: input.coverImageUrl ?? null }),
          ...(input.seriesId !== undefined && { seriesId: input.seriesId ?? null }),
          ...(input.seriesOrder !== undefined && { seriesOrder: input.seriesOrder ?? null }),
          status,
          publishedAt: nextPublishedAt,
          updatedAt: new Date(),
        })
        .where(eq(posts.id, id))
        .returning({ id: posts.id, slug: posts.slug })
        .catch(rethrowAsConflict)

      if (!updated) throw new HTTPException(500, { message: '글 수정에 실패했습니다.' })
      if (input.tags) await syncTags(db, id, input.tags)

      // 슬러그가 바뀌었으면 옛 경로도 같이 무효화한다
      const paths = ['/', `/posts/${updated.slug}`]
      if (existing.slug !== updated.slug) paths.push(`/posts/${existing.slug}`)
      c.executionCtx.waitUntil(revalidate(c.env, paths))

      return c.json(updated)
    },
  )

  .delete('/posts/:id', zValidator('param', idParamSchema, validationHook), async (c) => {
    const { id } = c.req.valid('param')

    const [deleted] = await c
      .get('db')
      .delete(posts)
      .where(eq(posts.id, id))
      .returning({ slug: posts.slug })

    if (!deleted) throw new HTTPException(404, { message: '글을 찾을 수 없습니다.' })

    c.executionCtx.waitUntil(revalidate(c.env, ['/', `/posts/${deleted.slug}`]))
    return c.json({ ok: true })
  })

  /** 에디터의 시리즈 셀렉트와 관리 목록이 쓴다. 글 수를 같이 준다. */
  .get('/series', async (c) => {
    const rows = await c
      .get('db')
      .select({
        id: series.id,
        slug: series.slug,
        title: series.title,
        description: series.description,
        count: sql<number>`count(${posts.id})::int`,
      })
      .from(series)
      .leftJoin(posts, eq(posts.seriesId, series.id))
      .groupBy(series.id)
      .orderBy(desc(series.createdAt))
    return c.json({ items: rows })
  })

  .post('/series', zValidator('json', seriesInputSchema, validationHook), async (c) => {
    const input = c.req.valid('json')

    const [created] = await c
      .get('db')
      .insert(series)
      .values({ slug: input.slug, title: input.title, description: input.description ?? null })
      .returning({ id: series.id, slug: series.slug })
      .catch(rethrowAsConflict)

    if (!created) throw new HTTPException(500, { message: '시리즈 저장에 실패했습니다.' })

    c.executionCtx.waitUntil(revalidate(c.env, ['/', `/series/${created.slug}`]))
    return c.json(created, 201)
  })

  .patch(
    '/series/:id',
    zValidator('param', idParamSchema, validationHook),
    zValidator('json', seriesPatchSchema, validationHook),
    async (c) => {
      const { id } = c.req.valid('param')
      const input = c.req.valid('json')
      const db = c.get('db')

      const [existing] = await db
        .select({ slug: series.slug })
        .from(series)
        .where(eq(series.id, id))
        .limit(1)
      if (!existing) throw new HTTPException(404, { message: '시리즈를 찾을 수 없습니다.' })

      const [updated] = await db
        .update(series)
        .set({
          ...(input.slug !== undefined && { slug: input.slug }),
          ...(input.title !== undefined && { title: input.title }),
          ...(input.description !== undefined && { description: input.description ?? null }),
        })
        .where(eq(series.id, id))
        .returning({ id: series.id, slug: series.slug })
        .catch(rethrowAsConflict)

      if (!updated) throw new HTTPException(500, { message: '시리즈 수정에 실패했습니다.' })

      // 제목·주소는 글 상세의 시리즈 박스에도 찍히므로 소속 글까지 무효화한다
      const paths = ['/', `/series/${updated.slug}`, ...(await seriesPostPaths(db, id))]
      if (existing.slug !== updated.slug) paths.push(`/series/${existing.slug}`)
      c.executionCtx.waitUntil(revalidate(c.env, paths))

      return c.json(updated)
    },
  )

  /** 소속 글은 지우지 않는다 — FK 가 seriesId 만 null 로 풀어준다. */
  .delete('/series/:id', zValidator('param', idParamSchema, validationHook), async (c) => {
    const { id } = c.req.valid('param')
    const db = c.get('db')

    // 삭제 뒤에는 소속 관계가 사라지므로 경로를 먼저 모아둔다
    const postPaths = await seriesPostPaths(db, id)

    const [deleted] = await db
      .delete(series)
      .where(eq(series.id, id))
      .returning({ slug: series.slug })

    if (!deleted) throw new HTTPException(404, { message: '시리즈를 찾을 수 없습니다.' })

    c.executionCtx.waitUntil(revalidate(c.env, ['/', `/series/${deleted.slug}`, ...postPaths]))
    return c.json({ ok: true })
  })

  /** 본문·커버 이미지 업로드. R2에 넣고 공개 URL을 돌려준다. */
  .post('/uploads', async (c) => {
    const form = await c.req.formData()
    const file = form.get('file')

    if (!(file instanceof File)) {
      throw new HTTPException(400, { message: '파일이 없습니다.' })
    }
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      throw new HTTPException(415, { message: '지원하지 않는 이미지 형식입니다.' })
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new HTTPException(413, { message: '이미지는 8MB까지 올릴 수 있습니다.' })
    }

    const extension = file.type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'bin'
    const key = `${new Date().getFullYear()}/${crypto.randomUUID()}.${extension}`

    await c.env.MEDIA.put(key, await file.arrayBuffer(), {
      httpMetadata: {
        contentType: file.type,
        // 업로드된 이미지는 키가 유일하므로 영구 캐시해도 안전하다
        cacheControl: 'public, max-age=31536000, immutable',
      },
    })

    return c.json({ url: `${c.env.MEDIA_BASE_URL}/${key}`, key }, 201)
  })
