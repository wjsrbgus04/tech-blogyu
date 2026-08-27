import { describe, expect, it } from 'vitest'
import { formatDate, toIsoDate } from './date'

describe('formatDate', () => {
  it('한국식 표기로 바꾼다', () => {
    expect(formatDate('2026-08-20T00:00:00.000Z')).toBe('2026년 8월 20일')
  })

  it('타임존을 서울로 고정한다 — 서버(UTC)와 클라이언트가 달라지면 하이드레이션이 깨진다', () => {
    // UTC 로는 8월 19일 23시지만 서울 기준으로는 8월 20일이다
    expect(formatDate('2026-08-19T23:00:00.000Z')).toBe('2026년 8월 20일')
  })

  it('값이 없거나 잘못되면 대시를 준다', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDate(undefined)).toBe('—')
    expect(formatDate('아무거나')).toBe('—')
  })
})

describe('toIsoDate', () => {
  it('ISO 문자열로 정규화한다', () => {
    expect(toIsoDate('2026-08-20T00:00:00.000Z')).toBe('2026-08-20T00:00:00.000Z')
  })

  it('값이 없거나 잘못되면 undefined 를 준다', () => {
    expect(toIsoDate(null)).toBeUndefined()
    expect(toIsoDate('아무거나')).toBeUndefined()
  })
})
