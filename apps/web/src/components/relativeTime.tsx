'use client'

import { useEffect, useState } from 'react'
import { formatRelativeTime } from '@/lib/date'

/**
 * "3시간 전" 표기.
 *
 * 서버에서 그리지 않고 마운트 후에 채운다. 이 페이지는 ISR 로 캐시되기
 * 때문에 서버에서 계산하면 그 순간의 문구가 굳어 며칠 뒤에도
 * "3시간 전"이라고 남는다. 7일이 지났으면 아무것도 그리지 않는다.
 */
export function RelativeTime({ iso }: { iso: string | null }) {
  const [text, setText] = useState<string | null>(null)

  useEffect(() => {
    setText(formatRelativeTime(iso))
  }, [iso])

  if (!text) return null
  return <span className="text-fg-faint">{text}</span>
}
