import { Hono } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { HTTPException } from 'hono/http-exception'
import type { AdminUser, Bindings } from '../lib/env'
import { clearSession, isAllowedAdmin, issueSession, readSession } from './session'

const STATE_COOKIE = 'blogyu_oauth_state'

type GitHubUser = {
  login: string
  name: string | null
  avatar_url: string
}

/**
 * GitHub OAuth. 허용 목록에 있는 계정만 세션을 발급받는다.
 * 비밀번호를 직접 다루지 않으므로 유출 위험이 없고, 계정 회수도 GitHub 쪽에서 끝난다.
 */
export const githubAuth = new Hono<{ Bindings: Bindings; Variables: { admin: AdminUser } }>()

  /** 1단계 — GitHub 인증 화면으로 보낸다. state 로 CSRF 를 막는다. */
  .get('/github', (c) => {
    const state = crypto.randomUUID()
    const isHttps = c.env.SITE_URL.startsWith('https://')

    setCookie(c, STATE_COOKIE, state, {
      httpOnly: true,
      secure: isHttps,
      sameSite: 'Lax',
      path: '/',
      maxAge: 600, // 10분 — 콜백까지 오는 데 그 이상 걸릴 이유가 없다
    })

    const url = new URL('https://github.com/login/oauth/authorize')
    url.searchParams.set('client_id', c.env.GITHUB_CLIENT_ID)
    url.searchParams.set('redirect_uri', `${new URL(c.req.url).origin}/auth/github/callback`)
    url.searchParams.set('scope', 'read:user')
    url.searchParams.set('state', state)

    return c.redirect(url.toString())
  })

  /** 2단계 — 코드를 토큰으로 바꾸고, 사용자 조회 후 허용 목록을 확인한다. */
  .get('/github/callback', async (c) => {
    const code = c.req.query('code')
    const state = c.req.query('state')
    const expectedState = getCookie(c, STATE_COOKIE)

    deleteCookie(c, STATE_COOKIE, { path: '/' })

    if (!code || !state || state !== expectedState) {
      throw new HTTPException(400, { message: '인증 요청이 유효하지 않습니다.' })
    }

    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: c.env.GITHUB_CLIENT_ID,
        client_secret: c.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    })

    const tokenJson = (await tokenRes.json()) as { access_token?: string; error?: string }
    if (!tokenJson.access_token) {
      throw new HTTPException(401, { message: 'GitHub 토큰 발급에 실패했습니다.' })
    }

    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenJson.access_token}`,
        Accept: 'application/vnd.github+json',
        // GitHub API 는 User-Agent 가 없으면 403을 준다
        'User-Agent': 'blogyu-admin',
      },
    })

    if (!userRes.ok) {
      throw new HTTPException(401, { message: 'GitHub 사용자 조회에 실패했습니다.' })
    }

    const gh = (await userRes.json()) as GitHubUser

    if (!isAllowedAdmin(gh.login, c.env.ADMIN_GITHUB_LOGINS)) {
      // 어떤 계정이 거절됐는지는 알려주지 않는다 — 허용 목록을 탐색당할 이유가 없다.
      throw new HTTPException(403, { message: '접근 권한이 없는 계정입니다.' })
    }

    await issueSession(c, {
      login: gh.login,
      name: gh.name ?? gh.login,
      avatarUrl: gh.avatar_url,
    })

    return c.redirect(`${c.env.SITE_URL}/admin`)
  })

  /** 현재 로그인 상태. 어드민 화면이 진입 시 호출한다. */
  .get('/me', async (c) => {
    const admin = await readSession(c)
    return c.json({ admin })
  })

  .post('/logout', (c) => {
    clearSession(c)
    return c.json({ ok: true })
  })
