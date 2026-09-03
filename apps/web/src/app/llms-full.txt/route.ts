import { fetchAllPosts, fetchPostDetail, toPostMarkdown } from '@/lib/posts'
import { SITE_DESCRIPTION, SITE_NAME } from '@/lib/seo'

export const revalidate = 3600

/**
 * 글 전문을 한 파일로 모은다.
 *
 * 최근 글 수를 제한하는 이유: Workers 무료 플랜은 요청 하나가 낼 수 있는
 * 하위 요청(subrequest)이 50개인데, 외부 fetch 만이 아니라 R2 읽기·쓰기 같은
 * 바인딩 호출도 여기에 든다. cached() 로 가져오는 글 한 편이 캐시 조회 +
 * API 호출 + 캐시 저장으로 3~4개를 쓰므로, 목록 1회와 이 라우트 자체의
 * 캐시 처리까지 더해 여유를 둔다. 글이 이보다 많아지면 앞쪽(최신) 글만 담긴다.
 */
const MAX_POSTS = 10

export async function GET() {
  const posts = (await fetchAllPosts(1)).slice(0, MAX_POSTS)
  const details = await Promise.all(posts.map((post) => fetchPostDetail(post.slug)))

  const documents = details.filter((detail) => detail !== null).map(toPostMarkdown)

  const header = [`# ${SITE_NAME}`, '', `> ${SITE_DESCRIPTION}`, '', ''].join('\n')

  return new Response(header + documents.join('\n\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600',
    },
  })
}
