import { describe, expect, it } from 'vitest'
import { type PostDetail, toPostMarkdown } from './posts'

function makeDetail(overrides: Partial<PostDetail['post']> = {}, tags: string[] = []): PostDetail {
  return {
    post: {
      slug: 'hello',
      title: '안녕',
      excerpt: '요약',
      content: '본문',
      coverImageUrl: null,
      publishedAt: '2026-08-28T08:12:12.033Z',
      updatedAt: '2026-08-29T01:00:00.000Z',
      readingMinutes: 3,
      viewCount: 0,
      likeCount: 0,
      ...overrides,
    },
    tags,
    series: null,
    prev: null,
    next: null,
  }
}

describe('toPostMarkdown', () => {
  it('front matter 와 제목, 본문을 순서대로 낸다', () => {
    const output = toPostMarkdown(makeDetail())

    expect(output.startsWith('---\n')).toBe(true)
    expect(output).toContain('title: "안녕"')
    expect(output).toContain('reading_minutes: 3')
    expect(output).toContain('\n# 안녕\n')
    expect(output.trimEnd().endsWith('본문')).toBe(true)
  })

  it('본문이 이미 H1 으로 시작하면 제목을 덧붙이지 않는다', () => {
    const output = toPostMarkdown(makeDetail({ content: '# 본문 제목\n\n내용' }))

    expect(output).not.toContain('# 안녕')
    expect(output.match(/^# /gm)).toHaveLength(1)
  })

  it('제목의 콜론과 따옴표가 front matter 를 깨뜨리지 않는다', () => {
    const output = toPostMarkdown(makeDetail({ title: 'Next.js: "빠른" 배포' }))

    expect(output).toContain('title: "Next.js: \\"빠른\\" 배포"')
  })

  it('역슬래시를 이스케이프한다', () => {
    const output = toPostMarkdown(makeDetail({ title: 'C:\\path' }))

    expect(output).toContain('title: "C:\\\\path"')
  })

  it('태그가 없으면 tags 줄을 빼고, 있으면 배열로 낸다', () => {
    expect(toPostMarkdown(makeDetail())).not.toContain('tags:')
    expect(toPostMarkdown(makeDetail({}, ['next', 'seo']))).toContain('tags: ["next", "seo"]')
  })

  it('발행일이 없으면 published 줄을 빼고 나머지는 유지한다', () => {
    const output = toPostMarkdown(makeDetail({ publishedAt: null }))

    expect(output).not.toContain('published:')
    expect(output).toContain('updated: 2026-08-29T01:00:00.000Z')
  })
})
