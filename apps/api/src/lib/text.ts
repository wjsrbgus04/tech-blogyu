/**
 * 읽는 데 걸리는 시간(분). 한글은 분당 약 500자, 코드 블록은 눈으로 훑는 속도가
 * 달라 별도로 계산한다. 정확할 필요는 없고 "대략 몇 분"만 맞으면 된다.
 */
export function estimateReadingMinutes(markdown: string): number {
  const codeBlocks = markdown.match(/```[\s\S]*?```/g) ?? []
  const codeChars = codeBlocks.reduce((sum, block) => sum + block.length, 0)
  const proseChars = markdown.length - codeChars

  const minutes = proseChars / 500 + codeChars / 900
  return Math.max(1, Math.round(minutes))
}

/**
 * 제목에서 슬러그를 만든다. 한글은 URL에서 인코딩되어 읽기 어려워지므로
 * 한글만 있는 제목은 빈 문자열을 돌려주고, 어드민이 직접 입력하게 한다.
 */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 160)
}

/**
 * 방문자 식별자. 원본 IP를 저장하지 않기 위해 시크릿을 섞어 해시한다.
 * 좋아요 중복만 막으면 되므로 이 정도 정확도로 충분하다.
 */
export async function hashVisitor(ip: string, userAgent: string, secret: string): Promise<string> {
  const data = new TextEncoder().encode(`${ip}:${userAgent}:${secret}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
