import { revalidatePath } from 'next/cache'

/**
 * 어드민에서 글을 저장하면 API 가 이 엔드포인트를 호출한다.
 * 전체 재빌드 없이 해당 경로만 몇 초 안에 갱신된다.
 */
export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET

  // 시크릿을 설정하지 않았으면 아무나 캐시를 날릴 수 있으므로 막는다
  if (!secret) {
    return Response.json({ error: 'revalidate secret이 설정되지 않았습니다.' }, { status: 503 })
  }
  if (request.headers.get('x-revalidate-secret') !== secret) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  let paths: unknown
  try {
    paths = (await request.json())?.paths
  } catch {
    return Response.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }

  if (!Array.isArray(paths) || paths.some((path) => typeof path !== 'string')) {
    return Response.json({ error: 'paths는 문자열 배열이어야 합니다.' }, { status: 400 })
  }

  for (const path of paths as string[]) {
    revalidatePath(path)
  }

  return Response.json({ revalidated: paths })
}
