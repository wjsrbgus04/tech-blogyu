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

describe('옛 페이지네이션 주소 redirect', () => {
  async function rules() {
    return (await nextConfig.redirects?.()) ?? []
  }

  it('홈과 태그 아카이브의 ?page=N 을 경로로 넘긴다', async () => {
    const list = await rules()
    expect(list).toContainEqual(
      expect.objectContaining({ source: '/', destination: '/page/:n', permanent: true }),
    )
    expect(list).toContainEqual(
      expect.objectContaining({
        source: '/tags/:name',
        destination: '/tags/:name/page/:n',
        permanent: true,
      }),
    )
  })

  /**
   * 값 정규식을 **있는 그대로** 쓴다. 테스트가 임의로 ^…$ 를 붙이면 앵커가 빠진 규칙도
   * 통과해버린다 — 실제로 그렇게 놓친 적이 있다. 앵커 없이 '02' 를 넣으면 안쪽 '2' 에
   * 부분 매칭돼 `:n` 이 치환되지 않은 `/page/:n` 으로 리다이렉트된다.
   */
  it('page=1 과 변형 표기는 넘기지 않는다', async () => {
    for (const rule of await rules()) {
      const has = rule.has?.find((item) => item.type === 'query' && item.key === 'page')
      if (!has?.value) throw new Error('page 쿼리 조건이 없다')
      const matcher = new RegExp(has.value)
      for (const value of ['2', '10', '999999']) expect(matcher.test(value)).toBe(true)
      for (const value of ['1', '0', '02', '2.0', 'abc', '', '1000000', 'x2x']) {
        expect(matcher.test(value)).toBe(false)
      }
    }
  })
})
