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

/**
 * 목록의 페이지 주소. 2페이지부터는 쿼리가 아니라 경로로 나눈다 —
 * 목록 화면이 쿼리를 읽으면 Next 가 동적 렌더로 돌려 ISR 캐시가 붙지 않고,
 * 그러면 글을 발행해도 재검증이 닿지 않아 옛 목록이 그대로 남는다.
 *
 * canonical 과 페이지네이션 링크가 이 함수 하나를 같이 쓴다. 규칙을 두 곳에
 * 적어두면 한쪽만 바뀌었을 때 색인이 갈라진다.
 */
export function pageHref(basePath: string, page: number): string {
  if (page <= 1) return basePath
  // basePath 가 '/' 일 때 그대로 이으면 '//page/2' 가 된다
  return `${basePath === '/' ? '' : basePath}/page/${page}`
}

/**
 * 경로 세그먼트로 들어온 페이지 번호. `pageHref` 의 역함수다.
 *
 * `Number()` 만 쓰면 '02'·'2.0'·'0x2'·'2e0' 가 전부 2 로 읽혀 같은 목록이 무한히 많은
 * 주소에서 200 으로 나간다 — 색인이 갈라지고, 정적 라우트가 된 지금은 그 변형마다
 * ISR 캐시 항목이 하나씩 쌓인다. 그래서 정규 표기만 받는다.
 *
 * 자릿수 상한이 있는 이유: 안전정수를 넘는 값(1e21)은 API 의 page 검증이 400 을 내고,
 * 그 실패 화면이 다시 캐시에 적재된다. 여기서 미리 404 로 끊는다.
 */
export function parsePageParam(value: string): number | null {
  if (!/^[1-9][0-9]{0,5}$/.test(value)) return null
  const page = Number(value)
  // 1페이지는 기준 경로가 맡는다. 두 주소로 같은 목록이 색인되지 않게 막는다.
  return page > 1 ? page : null
}

/**
 * 주소 세그먼트를 푼다. `%zz` 처럼 잘못 인코딩된 값이 오면 `decodeURIComponent` 가
 * URIError 를 던지는데, 이 라우트들은 프리렌더 대상이라 그 예외가 렌더 하나가 아니라
 * 빌드 전체를 멈춘다. 태그 이름에는 슬러그와 달리 문자 제한이 없어 실제로 들어올 수 있다.
 */
export function decodeSegment(value: string): string | null {
  try {
    return decodeURIComponent(value)
  } catch {
    return null
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
