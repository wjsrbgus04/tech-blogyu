/**
 * 재검증 웹훅에 경로와 함께 보낼 fetch 캐시 태그.
 *
 * 경로만 비우면 그 페이지 하나만 새로 그려진다. 글 하나가 바뀌어도 홈·태그·시리즈
 * 아카이브, 사이트맵, RSS, llms.txt 가 읽는 목록은 전부 달라지므로 목록 태그를 늘 보낸다.
 * 글 경로가 있으면 그 글의 상세 태그도 — 글 페이지 말고도 OG 이미지와 index.md 가
 * 같은 태그로 상세를 읽는다.
 *
 * 태그 이름은 web 의 `cached([...])` 호출부와 맞춰야 한다(apps/web/src/lib/apiClient.ts).
 */
const LIST_TAGS = ['posts', 'tags', 'series']

const POST_PATH = /^\/posts\/([^/]+)$/

export function cacheTags(paths: string[]): string[] {
  const postTags = paths.flatMap((path) => {
    const slug = POST_PATH.exec(path)?.[1]
    return slug ? [`post:${slug}`] : []
  })
  return [...LIST_TAGS, ...postTags]
}
