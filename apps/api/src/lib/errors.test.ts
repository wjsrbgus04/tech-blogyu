import { describe, expect, it } from 'vitest'
import { PG_UNIQUE_VIOLATION, pgConstraint, pgErrorCode } from './errors'

describe('pgErrorCode', () => {
  it('Drizzle 이 감싼 에러에서도 코드를 꺼낸다', () => {
    // 실제로 겪은 형태 — Drizzle 은 쿼리 실패를 자기 Error 로 감싸고
    // 원본 드라이버 에러를 cause 에 넣는다. 이걸 놓쳐서 500 이 나갔었다.
    const wrapped = Object.assign(new Error('Failed query: insert into "posts" ...'), {
      cause: { code: PG_UNIQUE_VIOLATION, constraint: 'posts_slug_unique', table: 'posts' },
    })

    expect(pgErrorCode(wrapped)).toBe('23505')
    expect(pgConstraint(wrapped)).toBe('posts_slug_unique')
  })

  it('코드가 최상위에 있는 에러도 읽는다', () => {
    expect(pgErrorCode({ code: '23503' })).toBe('23503')
  })

  it('Postgres 에러가 아니면 null 을 준다', () => {
    expect(pgErrorCode(new Error('그냥 에러'))).toBeNull()
    expect(pgErrorCode(null)).toBeNull()
    expect(pgErrorCode('문자열')).toBeNull()
    expect(pgErrorCode({ cause: null })).toBeNull()
  })

  it('코드가 문자열이 아니면 null 을 준다', () => {
    expect(pgErrorCode({ code: 23505 })).toBeNull()
  })
})
