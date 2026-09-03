import { describe, expect, it } from 'vitest'
import { blogPostingLd, breadcrumbLd, collectionPageLd } from './jsonLd'

const base = {
  slug: 'hello',
  title: '안녕',
  excerpt: '요약',
  content: '한 둘 셋 넷',
  coverImageUrl: null,
  publishedAt: '2026-08-28T08:12:12.033Z',
  updatedAt: '2026-08-29T01:00:00.000Z',
  imageUrl: 'https://example.test/og.png',
  readingMinutes: 5,
  seriesTitle: null,
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

  it('읽는 시간을 ISO 8601 기간으로 낸다', () => {
    expect(blogPostingLd({ ...base, tags: [] }).timeRequired).toBe('PT5M')
  })

  it('시리즈가 있을 때만 articleSection 을 넣는다', () => {
    expect(blogPostingLd({ ...base, tags: [] })).not.toHaveProperty('articleSection')
    expect(blogPostingLd({ ...base, tags: [], seriesTitle: 'Next 연재' }).articleSection).toBe(
      'Next 연재',
    )
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

describe('경로 인코딩', () => {
  // 한글·공백이 든 태그 경로는 Next 가 만드는 canonical(new URL)과 문자 그대로 같아야 한다
  const encoded = '/tags/%ED%95%9C%EA%B8%80%20%ED%83%9C%EA%B7%B8'

  it('collectionPageLd 의 url 을 퍼센트 인코딩한다', () => {
    const ld = collectionPageLd({
      name: '#한글 태그',
      description: '',
      path: '/tags/한글 태그',
      items: [],
    })

    expect(ld.url).toMatch(new RegExp(`${encoded}$`))
  })

  it('breadcrumbLd 의 item 을 퍼센트 인코딩한다', () => {
    const ld = breadcrumbLd([{ name: '#한글 태그', path: '/tags/한글 태그' }])

    expect(ld.itemListElement).toMatchObject([
      { item: expect.stringMatching(new RegExp(`${encoded}$`)) },
    ])
  })
})
