import { describe, expect, it } from 'vitest'
import { cacheTags } from './cacheTags'

describe('cacheTags', () => {
  it('경로가 무엇이든 목록 태그는 늘 보낸다', () => {
    // 시리즈만 고쳐도 홈·사이트맵·llms.txt 가 읽는 목록이 달라진다
    expect(cacheTags(['/', '/series/next'])).toEqual(['posts', 'tags', 'series'])
  })

  it('글 경로마다 상세 태그를 덧붙인다', () => {
    // 슬러그가 바뀐 글은 옛 주소의 상세 캐시도 함께 비워야 한다
    expect(cacheTags(['/', '/posts/new-slug', '/posts/old-slug'])).toEqual([
      'posts',
      'tags',
      'series',
      'post:new-slug',
      'post:old-slug',
    ])
  })

  it('글 아래 하위 경로는 상세 태그로 세지 않는다', () => {
    expect(cacheTags(['/posts/hello/index.md'])).toEqual(['posts', 'tags', 'series'])
  })
})
