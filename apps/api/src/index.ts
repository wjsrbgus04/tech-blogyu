import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import { logger } from 'hono/logger'
import { githubAuth } from './auth/github'
import { createDb, type Db } from './db/client'
import type { AdminUser, Bindings } from './lib/env'
import { adminRoute } from './routes/admin'
import { postsRoute } from './routes/posts'
import { searchRoute } from './routes/search'
import { seriesRoute } from './routes/series'
import { tagsRoute } from './routes/tags'

type Env = {
  Bindings: Bindings
  Variables: { db: Db; admin: AdminUser }
}

const app = new Hono<Env>()

app.use('*', logger())

app.use('*', (c, next) =>
  cors({
    // 세션 쿠키를 주고받으므로 와일드카드를 쓸 수 없다 — 오리진을 정확히 지정한다.
    origin: c.env.SITE_URL,
    credentials: true,
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
    maxAge: 86400,
  })(c, next),
)

/** 요청마다 db 를 만들어 컨텍스트에 싣는다. HTTP 드라이버라 생성 비용이 없다. */
app.use('*', async (c, next) => {
  c.set('db', createDb(c.env.DATABASE_URL))
  await next()
})

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status)
  }
  console.error('unhandled error:', err)
  return c.json({ error: '서버 오류가 발생했습니다.' }, 500)
})

app.notFound((c) => c.json({ error: '요청한 경로를 찾을 수 없습니다.' }, 404))

/**
 * R2 객체 서빙. 버킷에 공개 커스텀 도메인을 붙이면 이 라우트 없이도 되지만,
 * 도메인 없이 무료로 쓰려면 Workers 가 대신 내보내는 편이 확실하다.
 * 키가 유일해 내용이 바뀌지 않으므로 영구 캐시한다.
 */
app.get('/media/*', async (c) => {
  const key = c.req.path.replace(/^\/media\//, '')
  const object = await c.env.MEDIA.get(key)

  if (!object) return c.notFound()

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)
  headers.set('cache-control', 'public, max-age=31536000, immutable')

  return new Response(object.body, { headers })
})

const routes = app
  .get('/health', (c) => c.json({ ok: true }))
  .route('/auth', githubAuth)
  .route('/posts', postsRoute)
  .route('/tags', tagsRoute)
  .route('/series', seriesRoute)
  .route('/search', searchRoute)
  .route('/admin', adminRoute)

/**
 * 프론트엔드가 이 타입만 import 하면 fetch 응답 타입이 그대로 추론된다.
 * 스키마를 두 번 쓰지 않아도 되고, 라우트를 고치면 web 쪽에서 타입 에러가 난다.
 */
export type AppType = typeof routes

export default app
