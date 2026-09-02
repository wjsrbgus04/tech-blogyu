import { HTTPException } from 'hono/http-exception'

/** 스키마 필드명을 화면에서 쓰는 말로 바꾼다. */
const FIELD_LABELS: Record<string, string> = {
  slug: '주소',
  title: '제목',
  excerpt: '요약',
  content: '본문',
  tags: '태그',
  status: '발행 상태',
  publishedAt: '발행일',
  coverImageUrl: '커버 이미지',
  description: '설명',
  seriesId: '시리즈',
  seriesOrder: '시리즈 순서',
  q: '검색어',
  page: '페이지',
  limit: '개수',
  name: '태그 이름',
  id: '아이디',
}

/**
 * zValidator 가 넘겨주는 결과에서 우리가 실제로 읽는 부분만 추린 형태.
 * 넓게 잡아야 zod v3·v4 어느 쪽 에러가 와도 그대로 받는다.
 */
type ValidationResult =
  | { success: true }
  | {
      success: false
      error: { issues: readonly { path: readonly PropertyKey[]; message: string }[] }
    }

/**
 * zValidator 의 기본 동작은 ZodError 를 통째로 내보낸다.
 * issues 배열이 그대로 화면에 뜨면 사용자는 무엇을 고쳐야 할지 알 수 없다.
 * 첫 번째 문제만 사람이 읽을 수 있는 한 줄로 바꿔 400 으로 돌려준다.
 */
export function validationHook(result: ValidationResult): void {
  if (result.success) return

  const issue = result.error.issues[0]
  const key = issue?.path.filter((part) => typeof part === 'string').join('.') ?? ''
  const label = FIELD_LABELS[key] ?? key
  const message = issue?.message ?? '입력값 형식이 올바르지 않습니다.'

  throw new HTTPException(400, { message: label ? `${label}: ${message}` : message })
}
