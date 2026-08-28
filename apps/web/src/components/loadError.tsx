/** API 가 응답하지 않을 때 보여주는 자리. 404 와 구분해서 쓴다. */
export function LoadError({ label = '내용' }: { label?: string }) {
  return (
    <div className="py-20 text-center">
      <p className="mb-1.5 text-[1.1875rem] text-fg">{label}을 불러오지 못했습니다</p>
      <p className="text-[1.0625rem] text-fg-faint">잠시 후 다시 시도해 주세요.</p>
    </div>
  )
}
