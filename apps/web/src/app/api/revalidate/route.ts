import { revalidatePath, revalidateTag } from 'next/cache'

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

  let body: { paths?: unknown; tags?: unknown }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }

  const paths = body.paths ?? []
  const tags = body.tags ?? []
  const isStringArray = (value: unknown) =>
    Array.isArray(value) && value.every((item) => typeof item === 'string')

  if (!isStringArray(paths) || !isStringArray(tags)) {
    return Response.json({ error: 'paths와 tags는 문자열 배열이어야 합니다.' }, { status: 400 })
  }

  for (const path of paths as string[]) revalidatePath(path)
  // 태그로 비우면 경로를 일일이 나열하지 않아도 관련 fetch 캐시가 함께 날아간다.
  // Next 16 부터 만료 시점을 명시해야 한다 — expire: 0 은 지금 당장 버리라는 뜻이다.
  for (const tag of tags as string[]) revalidateTag(tag, { expire: 0 })

  return Response.json({ revalidated: { paths, tags } })
}
