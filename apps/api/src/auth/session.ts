import type { Context, MiddlewareHandler } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { HTTPException } from 'hono/http-exception'
import { sign, verify } from 'hono/jwt'
import type { AdminUser, Bindings } from '../lib/env'

const COOKIE_NAME = 'blogyu_session'
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7 // 7일
/** 대칭키 HMAC. 비대칭이 필요할 만큼 발급 주체가 여럿이 아니다. */
const JWT_ALG = 'HS256' as const

type AppContext = Context<{ Bindings: Bindings; Variables: { admin: AdminUser } }>

type SessionPayload = AdminUser & { exp: number }

/**
 * 쿠키 속성을 환경에 맞춰 고른다.
 *
 * web(Vercel)과 api(Workers)가 서로 다른 등록 도메인에 있으면 세션 쿠키가
 * 서드파티 쿠키가 되어 `SameSite=None; Secure` 가 필요하고, 브라우저가
 * 서드파티 쿠키를 차단하면 로그인 자체가 막힌다.
 *
 * 그래서 배포에서는 커스텀 도메인을 한 등록 도메인 아래로 묶는 것을 권장한다.
 *   blogyu.dev(web) + api.blogyu.dev(api) → AUTH_COOKIE_DOMAIN=".blogyu.dev"
 * 이 값이 있으면 same-site 로 취급되어 Lax 로 충분해진다.
 */
function cookieOptions(env: Bindings) {
  const isHttps = env.SITE_URL.startsWith('https://')
  const domain = env.AUTH_COOKIE_DOMAIN?.trim()

  return {
    httpOnly: true,
    secure: isHttps,
    path: '/',
    maxAge: MAX_AGE_SECONDS,
    ...(domain
      ? { domain, sameSite: 'Lax' as const }
      : { sameSite: (isHttps ? 'None' : 'Lax') as 'None' | 'Lax' }),
  }
}

export async function issueSession(c: AppContext, user: AdminUser): Promise<void> {
  const payload: SessionPayload = {
    ...user,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS,
  }
  const token = await sign(payload, c.env.AUTH_SECRET, JWT_ALG)
  setCookie(c, COOKIE_NAME, token, cookieOptions(c.env))
}

export function clearSession(c: AppContext): void {
  const { maxAge: _maxAge, ...rest } = cookieOptions(c.env)
  deleteCookie(c, COOKIE_NAME, rest)
}

/** 세션이 없거나 서명이 깨졌으면 null. 예외를 던지지 않는다. */
export async function readSession(c: AppContext): Promise<AdminUser | null> {
  const token = getCookie(c, COOKIE_NAME)
  if (!token) return null

  try {
    const payload = (await verify(token, c.env.AUTH_SECRET, JWT_ALG)) as unknown as SessionPayload
    return { login: payload.login, name: payload.name, avatarUrl: payload.avatarUrl }
  } catch {
    // 만료·위조 모두 여기로 온다. 로그인하지 않은 것과 같게 취급한다.
    return null
  }
}

/** 허용 목록에 있는 GitHub 계정인지 확인한다. */
export function isAllowedAdmin(login: string, allowList: string): boolean {
  return allowList
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
    .includes(login.toLowerCase())
}

/** 어드민 전용 라우트를 감싸는 미들웨어. 통과하면 c.get('admin') 을 쓸 수 있다. */
export const requireAdmin: MiddlewareHandler<{
  Bindings: Bindings
  Variables: { admin: AdminUser }
}> = async (c, next) => {
  const admin = await readSession(c as AppContext)
  if (!admin) {
    throw new HTTPException(401, { message: '로그인이 필요합니다.' })
  }
  // 세션 발급 이후 허용 목록에서 빠졌을 수 있으므로 매 요청 다시 확인한다.
  if (!isAllowedAdmin(admin.login, c.env.ADMIN_GITHUB_LOGINS)) {
    throw new HTTPException(403, { message: '접근 권한이 없습니다.' })
  }

  c.set('admin', admin)
  await next()
}
