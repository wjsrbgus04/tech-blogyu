export type PostStatus = 'draft' | 'published' | 'scheduled'

const LABEL: Record<PostStatus, string> = {
  published: '발행됨',
  scheduled: '예약됨',
  draft: '임시저장',
}

/**
 * 발행 상태 배지.
 *
 * 팔레트가 뉴트럴 + 액센트 한 색이라 상태마다 색을 새로 만들 수 없다.
 * 대신 점의 채움으로 나눈다 — 채워진 점은 나간 글, 속이 빈 점은
 * 나갈 예정인 글, 흐린 점은 아직 손에 있는 글.
 */
export function StatusPill({ status }: { status: PostStatus }) {
  const isLive = status === 'published'
  const isScheduled = status === 'scheduled'

  return (
    <span
      className={
        isLive || isScheduled
          ? 'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-accent-weak px-2 py-0.5 text-[1rem] text-accent-ink'
          : 'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border px-2 py-0.5 text-[1rem] text-fg-muted'
      }
    >
      <span
        aria-hidden="true"
        className={
          isLive
            ? 'size-[6px] shrink-0 rounded-full bg-accent'
            : isScheduled
              ? 'size-[6px] shrink-0 rounded-full border-[1.5px] border-accent'
              : 'size-[6px] shrink-0 rounded-full bg-fg-faint'
        }
      />
      {LABEL[status]}
    </span>
  )
}
