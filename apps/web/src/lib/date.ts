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

/** 상대 표기를 붙일 상한. 이보다 오래되면 날짜만으로 충분하다. */
const RELATIVE_LIMIT_DAYS = 7

/**
 * "3시간 전" 같은 상대 표기. 7일이 넘거나 미래(예약)면 null 을 준다.
 *
 * 반드시 클라이언트에서 호출해야 한다. 서버에서 계산하면 ISR 캐시에
 * 그 순간의 값이 굳어서 며칠 뒤에도 "3시간 전"이라고 나온다.
 */
export function formatRelativeTime(value: string | Date | null | undefined): string | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null

  const elapsedMs = Date.now() - date.getTime()
  if (elapsedMs < 0) return null

  const minutes = Math.floor(elapsedMs / 60_000)
  if (minutes < 1) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`

  const days = Math.floor(hours / 24)
  return days <= RELATIVE_LIMIT_DAYS ? `${days}일 전` : null
}
