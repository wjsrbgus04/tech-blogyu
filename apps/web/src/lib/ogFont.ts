import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

let cached: Buffer | null = null

/**
 * OG 이미지용 한글 폰트. satori 는 시스템 폰트를 쓸 수 없어 바이트를 직접 넘겨야 한다.
 * 요청마다 2.5MB 를 다시 읽지 않도록 모듈 스코프에 캐시한다.
 */
export async function loadOgFont(): Promise<Buffer> {
  if (!cached) {
    cached = await readFile(join(process.cwd(), 'src/fonts/Pretendard-Bold.ttf'))
  }
  return cached
}
