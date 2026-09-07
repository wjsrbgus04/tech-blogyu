import { describe, expect, it } from 'vitest'
import { decodeSegment, pageHref, parsePageParam, siteAlternates } from './seo'

describe('pageHref', () => {
  it('1페이지는 기준 경로 그대로다', () => {
    expect(pageHref('/', 1)).toBe('/')
    expect(pageHref('/tags/loop', 1)).toBe('/tags/loop')
  })

  // 쿼리(?page=2)로 나누면 목록 화면이 searchParams 를 읽어야 하고,
  // 그 순간 Next 가 동적 렌더로 돌려 ISR 캐시가 사라진다.
  it('2페이지부터는 경로 세그먼트로 나눈다', () => {
    expect(pageHref('/', 2)).toBe('/page/2')
    expect(pageHref('/tags/loop', 3)).toBe('/tags/loop/page/3')
  })

  it('홈에서 슬래시가 겹치지 않는다', () => {
    expect(pageHref('/', 2)).not.toContain('//')
  })

  it('canonical 과 페이지네이션 링크가 같은 주소를 낸다', () => {
    const alternates = siteAlternates(pageHref('/tags/loop', 2))
    expect(alternates?.canonical).toBe(pageHref('/tags/loop', 2))
  })
})

describe('parsePageParam', () => {
  it('정규 표기 2 이상만 받는다', () => {
    expect(parsePageParam('2')).toBe(2)
    expect(parsePageParam('10')).toBe(10)
    expect(parsePageParam('999999')).toBe(999999)
  })

  // Number() 만 쓰면 이것들이 전부 같은 페이지로 200 을 내서, 같은 목록이
  // 무한히 많은 주소로 색인되고 ISR 캐시 항목도 그만큼 쌓인다.
  it('같은 숫자의 변형 표기를 전부 거른다', () => {
    for (const value of ['02', '002', '2.0', '2.00', '0x2', '0b10', '2e0', '+2', ' 2', '2 ']) {
      expect(parsePageParam(value)).toBeNull()
    }
  })

  it('1 이하와 숫자가 아닌 값은 거른다 — 1페이지는 기준 경로가 맡는다', () => {
    for (const value of ['1', '0', '-1', '', 'abc', 'NaN', 'Infinity']) {
      expect(parsePageParam(value)).toBeNull()
    }
  })

  // 안전정수를 넘는 값은 API 의 page 검증이 400 을 내고, 그 실패 화면이 캐시에 적재된다.
  it('자릿수 상한을 넘는 값은 API 에 닿기 전에 거른다', () => {
    expect(parsePageParam('1000000')).toBeNull()
    expect(parsePageParam('1e21')).toBeNull()
    expect(parsePageParam('9007199254740993')).toBeNull()
  })

  it('pageHref 와 왕복한다', () => {
    for (const page of [2, 3, 42]) {
      const href = pageHref('/tags/loop', page)
      expect(parsePageParam(href.split('/page/')[1] ?? '')).toBe(page)
    }
  })
})

describe('decodeSegment', () => {
  it('보통 주소는 그대로 푼다', () => {
    expect(decodeSegment('loop')).toBe('loop')
    expect(decodeSegment('%ED%95%9C%EA%B8%80')).toBe('한글')
  })

  // 이 라우트들은 프리렌더 대상이라, decodeURIComponent 가 던지면
  // 렌더 하나가 아니라 빌드 전체가 멈춘다.
  it('잘못 인코딩된 값에 던지지 않고 null 을 준다', () => {
    for (const value of ['%', '%zz', '%E0%A4%A', 'p%25z%']) {
      expect(decodeSegment(value)).toBeNull()
    }
  })
})
