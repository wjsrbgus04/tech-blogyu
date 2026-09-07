import { SITE_URL } from '@/lib/apiClient'

const ENDPOINT = 'https://api.indexnow.org/indexnow'

/** 키를 내려주는 주소. IndexNow 는 이 URL 을 읽어 요청자가 사이트 주인인지 확인한다. */
export const KEY_PATH = '/indexnow-key.txt'

/**
 * 바뀐 주소를 IndexNow 에 알린다. 사이트맵을 다시 훑을 때까지 기다리지 않고
 * 색인이 갱신된다. Bing·Yandex 계열이 이 신호를 받는다 —
 * Google 은 참여하지 않으므로 사이트맵의 lastmod 로 대신한다.
 *
 * INDEXNOW_KEY 가 없으면 아무것도 하지 않는다. 색인 힌트일 뿐이라
 * 실패해도 재검증 결과에 영향을 주지 않는다.
 */
export async function pingIndexNow(paths: string[]): Promise<void> {
  const key = process.env.INDEXNOW_KEY
  if (!key || paths.length === 0) return

  const site = new URL(SITE_URL)
  // 로컬 주소는 외부에서 확인할 수 없어 어차피 거절당한다
  if (site.protocol !== 'https:') return

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: site.host,
        key,
        keyLocation: `${SITE_URL}${KEY_PATH}`,
        urlList: paths.map((path) => new URL(path, SITE_URL).href),
      }),
    })

    // 202 는 "접수했고 키 검증은 이제 한다"는 뜻이라 정상이다(ok 범위 안에 든다).
    // 403·422 는 키나 keyLocation 이 어긋난 것인데, 남기지 않으면 알림이 나가지
    // 않는 채로 영영 조용히 죽는다 — INDEXNOW_KEY 를 빠뜨렸을 때와 같은 실패 모양이다.
    if (!res.ok) console.warn(`[indexnow] 색인 알림이 ${res.status} 를 냈습니다`, paths)
  } catch {
    // 알리지 못해도 재검증은 이미 끝났다. 다음 크롤에 어차피 반영된다.
  }
}
