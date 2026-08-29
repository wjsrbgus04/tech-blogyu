import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/apiClient'

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

export default function robots(): MetadataRoute.Robots {
  // 검색 결과와 어드민은 색인 대상이 아니다
  const access = { allow: '/', disallow: ['/admin', '/search'] }

  return {
    rules: [
      { userAgent: '*', ...access },
      { userAgent: AI_CRAWLERS, ...access },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
