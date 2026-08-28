/**
 * Postgres 에러 코드를 꺼낸다.
 *
 * Drizzle 은 쿼리 실패를 자기 Error 로 감싸므로 code 가 최상위에 없다.
 * cause 까지 들어가야 원본 드라이버 에러가 나온다.
 */
export const PG_UNIQUE_VIOLATION = '23505'
export const PG_FOREIGN_KEY_VIOLATION = '23503'

type PgLikeError = { code?: unknown; constraint?: unknown }

function unwrap(error: unknown): PgLikeError | null {
  if (typeof error !== 'object' || error === null) return null

  const direct = error as PgLikeError & { cause?: unknown }
  if (typeof direct.code === 'string') return direct

  return typeof direct.cause === 'object' && direct.cause !== null
    ? (direct.cause as PgLikeError)
    : null
}

export function pgErrorCode(error: unknown): string | null {
  const pg = unwrap(error)
  return typeof pg?.code === 'string' ? pg.code : null
}

/** 어떤 제약을 어겼는지 — 슬러그 중복인지 태그 중복인지 구분할 때 쓴다. */
export function pgConstraint(error: unknown): string | null {
  const pg = unwrap(error)
  return typeof pg?.constraint === 'string' ? pg.constraint : null
}
