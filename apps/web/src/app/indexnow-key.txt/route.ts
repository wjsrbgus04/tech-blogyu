/**
 * IndexNow 소유 확인용 키 파일.
 *
 * 키를 환경변수로 두고 여기서 내보낸다 — 파일로 커밋하면 키를 바꿀 때마다
 * 파일 이름까지 같이 갈아야 한다. 스펙이 허용하는 keyLocation 방식이다.
 */
export async function GET() {
  const key = process.env.INDEXNOW_KEY

  if (!key) return new Response('not configured\n', { status: 404 })

  return new Response(key, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
