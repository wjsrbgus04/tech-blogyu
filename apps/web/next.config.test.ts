import { describe, expect, it } from 'vitest'
import nextConfig from './next.config'

/** rewrites() 의 마크다운 협상 규칙 하나를 꺼낸다. */
async function markdownRewrite() {
  const rewrites = await nextConfig.rewrites?.()
  const list = Array.isArray(rewrites) ? rewrites : (rewrites?.beforeFiles ?? [])
  const rule = list.find((item) => item.destination === '/posts/:slug/index.md')
  if (!rule) throw new Error('마크다운 rewrite 규칙이 없다')
  const has = rule.has?.find((item) => item.type === 'header' && item.key === 'accept')
  if (!has?.value) throw new Error('accept 헤더 조건이 없다')
  return { rule, pattern: has.value }
}

describe('마크다운 협상 rewrite', () => {
  // Next 는 값을 ^…$ 로 감싸고 OpenNext 는 그대로 쓴다. 둘 다에서 같은 답이 나와야 한다.
  const matchers = (pattern: string) => [new RegExp(`^${pattern}$`), new RegExp(pattern)]

  it('글 주소 한 단계만 본다', async () => {
    const { rule } = await markdownRewrite()
    expect(rule.source).toBe('/posts/:slug')
  })

  it('Accept 에 text/markdown 이 있으면 양쪽 의미 모두에서 맞는다', async () => {
    const { pattern } = await markdownRewrite()
    for (const accept of [
      'text/markdown',
      'text/markdown; charset=utf-8',
      'text/markdown, */*;q=0.1',
    ]) {
      for (const matcher of matchers(pattern)) expect(matcher.test(accept)).toBe(true)
    }
  })

  it('브라우저 Accept 와 curl 기본값은 양쪽 의미 모두에서 걸리지 않는다', async () => {
    const { pattern } = await markdownRewrite()
    for (const accept of [
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,*/*;q=0.8',
      '*/*',
      'text/plain',
    ]) {
      for (const matcher of matchers(pattern)) expect(matcher.test(accept)).toBe(false)
    }
  })

  it('글 주소에 Vary: Accept 를 붙인다', async () => {
    const headers = (await nextConfig.headers?.()) ?? []
    const rule = headers.find((item) => item.source === '/posts/:slug')
    expect(rule?.headers).toContainEqual({ key: 'Vary', value: 'Accept' })
  })
})
