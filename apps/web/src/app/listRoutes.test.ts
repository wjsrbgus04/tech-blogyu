import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * 목록 화면이 searchParams 를 읽으면 Next 가 그 라우트를 동적 렌더로 돌린다.
 * 그러면 ISR 캐시가 붙지 않아 재검증 웹훅의 revalidatePath 가 비울 대상도,
 * 시간 만료로 다시 그려질 기회도 없어진다 — 글을 발행해도 옛 목록이 영영 남는다.
 * 페이지 번호는 경로 세그먼트로만 받는다.
 */
const LIST_SOURCES = [
  './page.tsx',
  './page/[n]/page.tsx',
  './tags/[name]/page.tsx',
  './tags/[name]/page/[n]/page.tsx',
  '../components/postListPage.tsx',
  '../components/tagArchivePage.tsx',
]

function read(relative: string): string {
  return readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8')
}

describe('글 목록 라우트', () => {
  it.each(LIST_SOURCES)('%s 는 searchParams 를 읽지 않는다', (relative) => {
    expect(read(relative)).not.toContain('searchParams')
  })

  it('페이지 번호를 경로로 받는 라우트가 있다', () => {
    expect(read('./page/[n]/page.tsx')).toContain('params')
    expect(read('./tags/[name]/page/[n]/page.tsx')).toContain('params')
  })
})
