import { describe, expect, it } from 'vitest'
import { estimateReadingMinutes, hashVisitor, slugify } from './text'

describe('estimateReadingMinutes', () => {
  it('짧은 글도 최소 1분으로 센다', () => {
    expect(estimateReadingMinutes('짧다')).toBe(1)
    expect(estimateReadingMinutes('')).toBe(1)
  })

  it('한글 500자를 1분으로 본다', () => {
    expect(estimateReadingMinutes('가'.repeat(500))).toBe(1)
    expect(estimateReadingMinutes('가'.repeat(1500))).toBe(3)
  })

  it('코드 블록은 산문보다 빠르게 훑는 것으로 계산한다', () => {
    const prose = '가'.repeat(900)
    const code = `\`\`\`ts\n${'x'.repeat(890)}\n\`\`\``

    // 같은 분량이라도 코드 쪽이 더 짧게 나와야 한다
    expect(estimateReadingMinutes(code)).toBeLessThan(estimateReadingMinutes(prose))
  })
})

describe('slugify', () => {
  it('영문 제목을 하이픈 슬러그로 바꾼다', () => {
    expect(slugify('Hello World')).toBe('hello-world')
    expect(slugify('  Edge   Postgres  ')).toBe('edge-postgres')
  })

  it('구두점을 떨어내고 하이픈을 겹치지 않게 한다', () => {
    expect(slugify('Next.js 16: Cache Components!')).toBe('nextjs-16-cache-components')
  })

  it('한글만 있는 제목은 빈 문자열을 준다 — 어드민이 직접 입력해야 한다', () => {
    expect(slugify('엣지 런타임')).toBe('')
  })

  it('160자를 넘지 않는다', () => {
    expect(slugify('a'.repeat(300)).length).toBeLessThanOrEqual(160)
  })
})

describe('hashVisitor', () => {
  it('같은 입력에 같은 해시를 준다', async () => {
    const a = await hashVisitor('1.2.3.4', 'Mozilla/5.0', 'secret')
    const b = await hashVisitor('1.2.3.4', 'Mozilla/5.0', 'secret')
    expect(a).toBe(b)
    expect(a).toHaveLength(64)
  })

  it('IP 나 시크릿이 다르면 다른 해시를 준다', async () => {
    const base = await hashVisitor('1.2.3.4', 'UA', 'secret')
    expect(await hashVisitor('5.6.7.8', 'UA', 'secret')).not.toBe(base)
    expect(await hashVisitor('1.2.3.4', 'UA', 'other')).not.toBe(base)
  })

  it('원본 IP 를 담고 있지 않다', async () => {
    const hash = await hashVisitor('203.0.113.42', 'UA', 'secret')
    expect(hash).not.toContain('203')
  })
})
