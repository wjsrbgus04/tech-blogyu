import { describe, expect, it } from 'vitest'
import { GET } from './route'

describe('robots.txt', () => {
  it('모든 그룹에 Content-Signal 을 선언하고 사이트맵을 가리킨다', async () => {
    const body = await GET().text()
    const groups = body.split('\n\n').filter((block) => block.startsWith('User-agent:'))

    expect(groups).toHaveLength(2)
    for (const block of groups) {
      // Content-Signal 은 User-agent 그룹 안에 있어야 크롤러가 자기 규칙으로 읽는다
      expect(block).toContain('Content-Signal: search=yes, ai-input=yes, ai-train=yes')
      expect(block).toContain('Allow: /')
      expect(block).toContain('Disallow: /admin')
      expect(block).toContain('Disallow: /search')
      expect(block).toContain('Disallow: /api')
    }
    expect(body).toMatch(/^Sitemap: https?:\/\/.+\/sitemap\.xml$/m)
  })

  it('첫 그룹은 * 이고 둘째 그룹에 AI 크롤러가 이름으로 들어간다', async () => {
    const body = await GET().text()

    expect(body.indexOf('User-agent: *')).toBeLessThan(body.indexOf('User-agent: GPTBot'))
    expect(body).toContain('User-agent: OAI-SearchBot')
    expect(body).toContain('User-agent: ClaudeBot')
  })
})
