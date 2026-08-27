/**
 * 날짜 표기. 서버(UTC)와 클라이언트(로컬)에서 다른 값이 나오면 하이드레이션이 깨지므로
 * 타임존을 서울로 고정한다. 필자와 독자가 대부분 한국에 있다는 전제다.
 */
const formatter = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return formatter.format(date)
}

/** <time datetime=""> 에 넣을 ISO 문자열. */
export function toIsoDate(value: string | Date | null | undefined): string | undefined {
  if (!value) return undefined
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}
