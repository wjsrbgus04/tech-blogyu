import type { Metadata } from 'next'
import { SITE_URL } from '@/lib/apiClient'

export const SITE_NAME = 'blogyu'
export const SITE_DESCRIPTION = '직접 경험한 것과 해결해본 것에 대해 씁니다. 대체로 실패한 이야기.'
export const SITE_LOCALE = 'ko_KR'
/** JSON-LD 의 inLanguage 는 BCP 47 을 쓴다 — og:locale 의 밑줄 표기와 다르다. */
export const SITE_LANGUAGE = 'ko-KR'

/**
 * 글쓴이. JSON-LD 의 author·publisher 가 같은 객체를 가리키게 해서
 * 검색엔진과 AI 답변엔진이 "누가 쓴 글인지"를 한 사람으로 묶을 수 있게 한다.
 */
export const AUTHOR = {
  name: SITE_NAME,
  github: 'https://github.com/wjsrbgus04',
} as const

/**
 * 페이지마다 자기 자신을 가리키는 canonical 을 만든다.
 *
 * 루트 레이아웃에 alternates 를 두면 안 된다 — Next 의 메타데이터 병합은
 * 얕아서, alternates 를 정의하지 않은 하위 페이지가 루트의 canonical('/')을
 * 그대로 물려받는다. 반대로 하위에서 alternates 를 정의하면 RSS 링크가
 * 통째로 날아간다. 그래서 canonical 과 RSS 를 여기서 한 번에 묶는다.
 */
type AlternateTypes = NonNullable<NonNullable<Metadata['alternates']>['types']>

export function siteAlternates(path: string, types?: AlternateTypes): Metadata['alternates'] {
  return {
    canonical: path,
    types: {
      'application/rss+xml': [{ url: '/feed.xml', title: SITE_NAME }],
      ...types,
    },
  }
}

/** 글 본문 마크다운을 그대로 받아 가는 주소. AI 크롤러가 렌더된 HTML 대신 읽는다. */
export function markdownUrl(slug: string): string {
  return `${SITE_URL}/posts/${slug}/index.md`
}

/** 커버가 없으면 Next 가 글마다 그려 두는 OG 이미지를 쓴다. */
export function postImageUrl(slug: string, coverImageUrl: string | null): string {
  return coverImageUrl ?? `${SITE_URL}/posts/${slug}/opengraph-image`
}
