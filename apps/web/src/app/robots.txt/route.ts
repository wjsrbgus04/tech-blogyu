import { SITE_URL } from '@/lib/apiClient'

// 값이 바뀌지 않으므로 빌드 때 한 번 만든다. Next 15 부터 GET 라우트는 기본이 동적이다.
export const dynamic = 'force-static'

/**
 * AI 크롤러를 이름으로 적어 둔다. 지금 규칙은 * 와 같지만 —
 * 정책(학습용 수집을 막을지, 답변 인용만 허용할지)을 바꿀 때
 * 고칠 자리를 한 곳에 모아 두려는 것이다.
 *
 * robots.txt 는 "요청해 달라"는 신호일 뿐이다. Cloudflare 대시보드의
 * AI 크롤러 차단이 켜져 있으면 여기서 열어도 엣지에서 먼저 막힌다.
 */
const AI_CRAWLERS = [
  // 사용자 질문에 답하며 출처를 링크하는 쪽
  'OAI-SearchBot',
  'ChatGPT-User',
  'PerplexityBot',
  'Perplexity-User',
  'Claude-SearchBot',
  'Claude-User',
  'Google-Extended',
  'Applebot-Extended',
  // 학습 데이터를 모으는 쪽
  'GPTBot',
  'ClaudeBot',
  'CCBot',
  'Bytespider',
  'Amazonbot',
  'meta-externalagent',
]

/** 검색 결과·어드민·재검증 API 는 색인 대상이 아니다 */
const DISALLOW = ['/admin', '/search', '/api']

/**
 * Content Signals — 크롤러가 가져간 내용을 어디까지 써도 되는지 선언한다.
 * search: 검색 색인 · ai-input: 답변 생성 시 인용(RAG) · ai-train: 모델 학습.
 * 셋 다 허용한다. 이 값을 바꾸면 위 AI_CRAWLERS 규칙도 같이 맞춘다.
 *
 * Next 의 robots.ts(MetadataRoute.Robots)는 이 줄을 낼 수 없어 라우트 핸들러로 쓴다.
 */
const CONTENT_SIGNAL = 'search=yes, ai-input=yes, ai-train=yes'

/** User-agent 그룹 하나. 규칙은 모든 그룹이 같다. */
function group(userAgents: string[]): string[] {
  return [
    ...userAgents.map((agent) => `User-agent: ${agent}`),
    `Content-Signal: ${CONTENT_SIGNAL}`,
    'Allow: /',
    ...DISALLOW.map((path) => `Disallow: ${path}`),
  ]
}

export function GET() {
  const lines = [
    '# Content-Signal 은 크롤러가 가져간 내용의 용도(검색·AI 답변·AI 학습)를 선언한다.',
    '# 형식: https://contentsignals.org/',
    '',
    ...group(['*']),
    '',
    ...group(AI_CRAWLERS),
    '',
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    '',
  ]

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=86400',
    },
  })
}
