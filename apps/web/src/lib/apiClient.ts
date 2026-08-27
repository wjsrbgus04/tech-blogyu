import type { AppType } from '@blogyu/api'
import { hc } from 'hono/client'

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787'
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

/**
 * 백엔드 라우터 타입을 그대로 받아쓰는 RPC 클라이언트.
 * 스키마를 두 번 정의하지 않아도 되고, API 라우트를 고치면 여기서 타입 에러가 난다.
 */
export const api = hc<AppType>(API_URL)

/**
 * 공개 데이터 캐시 주기(초). 글 발행 시 어드민이 재검증 웹훅을 쏘므로
 * 이 값은 "웹훅이 실패했을 때의 안전망"에 가깝다.
 */
export const REVALIDATE_SECONDS = 300

/** 서버 컴포넌트에서 쓰는 fetch 옵션 — ISR 캐시를 태운다. */
export const cached = (tags: string[] = []) => ({
  init: { next: { revalidate: REVALIDATE_SECONDS, tags } },
})

/** 어드민·조회수처럼 캐시하면 안 되는 요청. */
export const uncached = {
  init: { cache: 'no-store' as const, credentials: 'include' as const },
}
