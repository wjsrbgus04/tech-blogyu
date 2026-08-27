/**
 * "찾을 수 없음"과 "지금 불러올 수 없음"을 구분한다.
 *
 * 둘을 합쳐서 null 로 다루면 API 가 잠깐 죽었을 때도 404 가 나간다.
 * 글이 사라진 게 아니라 서버가 문제인데 404 를 주면 크롤러가 색인에서
 * 빼버리고, 독자는 주소를 잘못 안 줄 안다.
 */
export type LoadResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: 'notFound' | 'unavailable' }

export async function loadOrFail<T>(fetcher: () => Promise<Response>): Promise<LoadResult<T>> {
  try {
    const res = await fetcher()
    if (res.status === 404) return { ok: false, reason: 'notFound' }
    if (!res.ok) return { ok: false, reason: 'unavailable' }
    return { ok: true, data: (await res.json()) as T }
  } catch {
    // 네트워크 실패·타임아웃 — 자원이 없는 것과는 다르다
    return { ok: false, reason: 'unavailable' }
  }
}
