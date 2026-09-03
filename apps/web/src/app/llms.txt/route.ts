import { SITE_URL } from '@/lib/apiClient'
import { toIsoDate } from '@/lib/date'
import { fetchAllPosts } from '@/lib/posts'
import { markdownUrl, SITE_DESCRIPTION, SITE_NAME } from '@/lib/seo'

export const revalidate = 3600

/** 한 줄로 눌러 담는다 — 목록 항목이 여러 줄로 쪼개지면 형식이 깨진다. */
function oneLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

/**
 * llmstxt.org 규약에 맞춘 사이트 색인.
 *
 * 사람이 읽는 사이트맵에 가깝다. 글마다 마크다운 원문 주소를 걸어 두어,
 * AI 크롤러가 HTML 을 거치지 않고 본문에 바로 닿게 한다.
 */
export async function GET() {
  const posts = await fetchAllPosts()

  const lines = [
    `# ${SITE_NAME}`,
    '',
    `> ${SITE_DESCRIPTION}`,
    '',
    '한국어로 쓰는 기술 블로그입니다. 아래 글 링크는 모두 마크다운 원문이라,',
    'HTML 을 파싱하지 않아도 코드블록과 표가 원형 그대로 전달됩니다.',
    `글 전문을 한 파일로 받으려면 ${SITE_URL}/llms-full.txt 를 쓰세요.`,
    '',
    '## 글',
    '',
    ...posts.map((post) => {
      const date = toIsoDate(post.publishedAt)?.slice(0, 10)
      const meta = [date, post.tags.length > 0 ? post.tags.join(', ') : null]
        .filter(Boolean)
        .join(' · ')
      return `- [${oneLine(post.title)}](${markdownUrl(post.slug)}): ${oneLine(post.excerpt)}${meta ? ` (${meta})` : ''}`
    }),
    '',
    '## 아카이브',
    '',
    `- [태그](${SITE_URL}/tags): 주제별 글 목록`,
    `- [시리즈](${SITE_URL}/series): 연재 목록`,
    `- [RSS](${SITE_URL}/feed.xml): 새 글 피드`,
    '',
  ]

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600',
    },
  })
}
