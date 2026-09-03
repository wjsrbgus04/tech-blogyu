import { SITE_URL } from '@/lib/apiClient'
import { AUTHOR, SITE_DESCRIPTION, SITE_LANGUAGE, SITE_NAME } from '@/lib/seo'

export type JsonLd = Record<string, unknown>

/**
 * 경로를 절대 주소로 만든다. 한글·공백이 든 태그 경로는 그대로 두면 유효한
 * URL 이 아니다 — Next 가 canonical 을 만들 때와 같은 방식(new URL)으로
 * 퍼센트 인코딩해서 두 값이 문자 그대로 일치하게 한다.
 */
function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).href
}

/**
 * 글쓴이 노드. author 와 publisher 가 같은 @id 를 쓰게 해서 문서마다
 * 사람이 새로 생기지 않게 한다 — 검색엔진이 하나의 엔티티로 합쳐 본다.
 */
const PERSON_ID = `${SITE_URL}/#person`

export function personLd(): JsonLd {
  return {
    '@type': 'Person',
    '@id': PERSON_ID,
    name: AUTHOR.name,
    url: SITE_URL,
    sameAs: [AUTHOR.github],
  }
}

/** 홈에 싣는다. 검색 결과에 표시되는 사이트 이름을 이 값이 정한다. */
export function websiteLd(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    inLanguage: SITE_LANGUAGE,
    author: personLd(),
    publisher: { '@id': PERSON_ID },
  }
}

export function blogPostingLd(input: {
  slug: string
  title: string
  excerpt: string
  content: string
  coverImageUrl: string | null
  publishedAt: string | undefined
  updatedAt: string | undefined
  tags: string[]
  imageUrl: string
  readingMinutes: number
  seriesTitle: string | null
}): JsonLd {
  const url = `${SITE_URL}/posts/${input.slug}`

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: input.title,
    description: input.excerpt,
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    datePublished: input.publishedAt,
    dateModified: input.updatedAt,
    image: input.imageUrl,
    author: personLd(),
    publisher: { '@id': PERSON_ID },
    isPartOf: { '@id': `${SITE_URL}/#website` },
    inLanguage: SITE_LANGUAGE,
    // 한국어라 어절 수로 센다. 정확한 통계가 아니라 글의 분량을 알리는 게 목적이다.
    wordCount: input.content.trim().split(/\s+/).length,
    // ISO 8601 기간. 화면의 "N분 분량"과 같은 값이다.
    timeRequired: `PT${input.readingMinutes}M`,
    // 시리즈가 글의 섹션 역할을 한다 — 검색엔진이 연재를 한 주제로 묶어 본다
    ...(input.seriesTitle ? { articleSection: input.seriesTitle } : {}),
    // 빈 배열을 내보내면 keywords:"" 가 나가므로 태그가 있을 때만 넣는다
    ...(input.tags.length > 0 ? { keywords: input.tags } : {}),
  }
}

/** 목록 페이지(태그·시리즈 아카이브)에 싣는다. */
export function collectionPageLd(input: {
  name: string
  description: string
  path: string
  items: { slug: string; title: string }[]
}): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: input.name,
    description: input.description,
    url: absoluteUrl(input.path),
    inLanguage: SITE_LANGUAGE,
    isPartOf: { '@id': `${SITE_URL}/#website` },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: input.items.length,
      itemListElement: input.items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${SITE_URL}/posts/${item.slug}`,
        name: item.title,
      })),
    },
  }
}

/** 검색 결과에 경로를 함께 띄운다. 마지막 항목이 현재 페이지다. */
export function breadcrumbLd(trail: { name: string; path: string }[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  }
}
