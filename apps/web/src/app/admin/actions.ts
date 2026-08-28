'use server'

import { renderMarkdown } from '@/lib/markdown'

/**
 * 에디터 미리보기. 마크다운 렌더링을 서버에서 하면 Shiki(수 MB)가
 * 클라이언트 번들에 들어가지 않고, 실제 글 화면과 같은 결과를 보장한다.
 */
export async function previewMarkdown(markdown: string): Promise<string> {
  const { html } = await renderMarkdown(markdown)
  return html
}
