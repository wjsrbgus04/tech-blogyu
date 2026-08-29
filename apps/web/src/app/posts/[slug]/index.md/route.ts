import { fetchPostDetail, toPostMarkdown } from '@/lib/posts'

export const revalidate = 300

/**
 * 글 원문을 마크다운 그대로 내보낸다.
 *
 * AI 크롤러·답변엔진이 HTML 에서 본문을 긁어내는 대신 이걸 읽으면
 * 코드블록과 표가 원형대로 전달된다. 글 페이지의
 * <link rel="alternate" type="text/markdown"> 이 여기를 가리킨다.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const detail = await fetchPostDetail((await params).slug)

  if (!detail) {
    return new Response('글을 찾을 수 없습니다.\n', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  return new Response(toPostMarkdown(detail), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=300',
    },
  })
}
