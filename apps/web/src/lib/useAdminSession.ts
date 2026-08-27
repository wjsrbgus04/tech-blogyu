'use client'

import { useCallback, useEffect, useState } from 'react'
import { API_URL, api, uncached } from '@/lib/apiClient'

export type AdminUser = { login: string; name: string; avatarUrl: string }
type SessionState = 'loading' | 'authed' | 'guest'

/**
 * 어드민 세션. 세션 쿠키는 API 도메인에 걸려 있어 Next 서버가 볼 수 없으므로
 * 브라우저에서 credentials: 'include' 로 직접 확인한다.
 */
export function useAdminSession() {
  const [state, setState] = useState<SessionState>('loading')
  const [admin, setAdmin] = useState<AdminUser | null>(null)

  useEffect(() => {
    let alive = true

    api.auth.me
      .$get(undefined, uncached)
      .then((res) => (res.ok ? res.json() : { admin: null }))
      .then((data) => {
        if (!alive) return
        setAdmin(data.admin)
        setState(data.admin ? 'authed' : 'guest')
      })
      .catch(() => {
        if (alive) setState('guest')
      })

    return () => {
      alive = false
    }
  }, [])

  const signIn = useCallback(() => {
    // OAuth 는 리다이렉트 흐름이라 fetch 로 처리할 수 없다
    window.location.href = `${API_URL}/auth/github`
  }, [])

  const signOut = useCallback(async () => {
    await api.auth.logout.$post(undefined, uncached).catch(() => {})
    setAdmin(null)
    setState('guest')
  }, [])

  return { state, admin, signIn, signOut }
}
