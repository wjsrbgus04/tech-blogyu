import { describe, expect, it } from 'vitest'
import { seriesInputSchema, seriesPatchSchema } from './schemas'

describe('seriesInputSchema', () => {
  it('슬러그·제목만 있으면 통과하고 설명은 비워둘 수 있다', () => {
    const result = seriesInputSchema.safeParse({ slug: 'free-tier', title: ' 무료 티어 ' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.title).toBe('무료 티어')
      expect(result.data.description).toBeUndefined()
    }
  })

  it('슬러그는 소문자·숫자·하이픈만 허용한다', () => {
    for (const slug of ['Free-Tier', '무료', 'free_tier', '-lead', 'trail-', 'a--b']) {
      expect(seriesInputSchema.safeParse({ slug, title: 't' }).success, slug).toBe(false)
    }
  })

  it('빈 제목과 너무 긴 설명을 막는다', () => {
    expect(seriesInputSchema.safeParse({ slug: 'a', title: '   ' }).success).toBe(false)
    expect(
      seriesInputSchema.safeParse({ slug: 'a', title: 't', description: 'x'.repeat(201) }).success,
    ).toBe(false)
  })

  it('설명은 null 로 지울 수 있다', () => {
    const result = seriesInputSchema.safeParse({ slug: 'a', title: 't', description: null })
    expect(result.success).toBe(true)
  })
})

describe('seriesPatchSchema', () => {
  it('일부 필드만 보내도 되지만, 보낸 필드는 규칙을 따라야 한다', () => {
    expect(seriesPatchSchema.safeParse({ title: '새 제목' }).success).toBe(true)
    expect(seriesPatchSchema.safeParse({ slug: 'Bad Slug' }).success).toBe(false)
  })
})
