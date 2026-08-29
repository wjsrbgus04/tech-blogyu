import { describe, expect, it } from 'vitest'
import { blogPostingLd, breadcrumbLd } from './jsonLd'

const base = {
  slug: 'hello',
  title: '안녕',
  excerpt: '요약',
  content: '한 둘 셋 넷',
  coverImageUrl: null,
  publishedAt: '2026-08-28T08:12:12.033Z',
  updatedAt: '2026-08-29T01:00:00.000Z',
  imageUrl: 'https://example.test/og.png',
}

describe('blogPostingLd', () => {
  it('태그가 없으면 keywords 를 아예 넣지 않는다', () => {
    // keywords:"" 가 나가면 구조화 데이터 검사에서 빈 값으로 잡힌다
    expect(blogPostingLd({ ...base, tags: [] })).not.toHaveProperty('keywords')
  })

  it('태그가 있으면 배열 그대로 넣는다', () => {
    expect(blogPostingLd({ ...base, tags: ['next', 'seo'] }).keywords).toEqual(['next', 'seo'])
  })

  it('본문 어절 수를 wordCount 로 낸다', () => {
    expect(blogPostingLd({ ...base, tags: [] }).wordCount).toBe(4)
  })

  it('mainEntityOfPage 와 url 이 같은 글 주소를 가리킨다', () => {
    const ld = blogPostingLd({ ...base, tags: [] })

    expect(ld.url).toContain('/posts/hello')
    expect(ld.mainEntityOfPage).toEqual({ '@type': 'WebPage', '@id': ld.url })
  })
})

describe('breadcrumbLd', () => {
  it('순서대로 position 을 1부터 매긴다', () => {
    const ld = breadcrumbLd([
      { name: '홈', path: '/' },
      { name: '태그', path: '/tags' },
    ])

    expect(ld.itemListElement).toMatchObject([{ position: 1, name: '홈' }, { position: 2 }])
  })
})
