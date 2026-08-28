import { getCloudflareContext } from '@opennextjs/cloudflare'

/** public/ 기준 경로. 정적 에셋으로 배포되어 워커가 바인딩으로 읽는다. */
const FONT_PATH = '/fonts/Pretendard-Bold.ttf'

let cached: ArrayBuffer | null = null

/**
 * OG 이미지용 한글 폰트. satori 는 시스템 폰트를 쓸 수 없어 바이트를 직접 넘겨야 한다.
 * 2.6MB 를 요청마다 다시 읽지 않도록 모듈 스코프에 캐시한다.
 *
 * 읽는 경로가 둘인 이유:
 *  - 배포된 워커에는 파일시스템이 없다. 정적 에셋 바인딩으로 읽는다.
 *  - next build / next dev 는 Node 라 바인딩이 없다. public/ 에서 직접 읽는다.
 *    홈 OG 이미지(/opengraph-image)가 빌드 시점에 미리 생성되므로 이 경로도 꼭 필요하다.
 */
export async function loadOgFont(): Promise<ArrayBuffer> {
  cached ??= (await fromAssetBinding()) ?? (await fromPublicDir())
  return cached
}

/** 배포된 워커 경로. 바인딩이 없는 환경(빌드·dev)에서는 null 을 준다. */
async function fromAssetBinding(): Promise<ArrayBuffer | null> {
  try {
    const assets = getCloudflareContext().env.ASSETS
    if (!assets) return null

    // 바인딩은 호스트를 보지 않지만 fetch 는 절대 URL 을 요구한다.
    const res = await assets.fetch(new URL(FONT_PATH, 'https://assets.invalid'))
    return res.ok ? await res.arrayBuffer() : null
  } catch {
    return null
  }
}

/** 빌드·로컬 개발 경로. */
async function fromPublicDir(): Promise<ArrayBuffer> {
  const { readFile } = await import('node:fs/promises')
  const { join } = await import('node:path')

  const buffer = await readFile(join(process.cwd(), 'public', FONT_PATH))
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
}
