import type { R2Bucket } from '@cloudflare/workers-types'

/**
 * Workers 환경 바인딩. 비밀값은 `wrangler secret put <NAME>` 으로 넣고,
 * 로컬 개발에서는 apps/api/.dev.vars 에 같은 이름으로 둔다.
 */
export type Bindings = {
  /** Neon pooled connection string */
  DATABASE_URL: string
  GITHUB_CLIENT_ID: string
  GITHUB_CLIENT_SECRET: string
  /** 어드민 접근을 허용할 GitHub 로그인 아이디 (쉼표 구분) */
  ADMIN_GITHUB_LOGINS: string
  /** 세션 JWT 서명 키 */
  AUTH_SECRET: string
  /**
   * 세션 쿠키를 걸 상위 도메인 (예: ".blogyu.dev").
   * web 과 api 를 같은 등록 도메인 아래에 두면 지정한다 — 서드파티 쿠키 차단을 피할 수 있다.
   * 비워두면 SameSite=None 으로 동작한다.
   */
  AUTH_COOKIE_DOMAIN?: string
  /** web 의 ISR 재검증 엔드포인트와 공유하는 시크릿 */
  REVALIDATE_SECRET: string
  /** 프론트엔드 오리진 — CORS 허용과 OAuth 리다이렉트에 쓴다 */
  SITE_URL: string
  /** R2 공개 도메인 (업로드된 이미지 URL 조립용) */
  MEDIA_BASE_URL: string
  MEDIA: R2Bucket
}

/** 로그인한 관리자 정보. 인증 미들웨어가 컨텍스트에 실어준다. */
export type AdminUser = {
  login: string
  name: string
  avatarUrl: string
}
