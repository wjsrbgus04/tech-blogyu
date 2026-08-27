import rehypeShiki from '@shikijs/rehype'
import type { Root } from 'hast'
import { toString as hastToString } from 'hast-util-to-string'
import rehypeSlug from 'rehype-slug'
import rehypeStringify from 'rehype-stringify'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'
import { codeThemeDark, codeThemeLight } from './codeTheme'

export type TocItem = {
  id: string
  text: string
  level: 2 | 3
}

/**
 * 렌더링과 동시에 목차를 모은다. 파이프라인을 두 번 돌리지 않기 위해
 * rehype-slug 뒤에 붙여 id 가 채워진 상태의 헤딩만 읽는다.
 */
function collectHeadings(sink: TocItem[]) {
  return () => (tree: Root) => {
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'h2' && node.tagName !== 'h3') return
      const id = typeof node.properties?.id === 'string' ? node.properties.id : ''
      if (!id) return

      sink.push({
        id,
        text: hastToString(node),
        level: node.tagName === 'h2' ? 2 : 3,
      })
    })
  }
}

/**
 * 라이트/다크 두 벌을 CSS 변수로 내보낸다. defaultColor: false 이므로
 * 실제 색 적용은 globals.css 의 `.prose pre span` 규칙이 담당한다 —
 * 이 규칙이 없으면 변수만 심기고 코드가 전부 단색으로 나온다.
 */
const shikiOptions = {
  themes: { light: codeThemeLight, dark: codeThemeDark },
  // false 로 좁혀둔다 — boolean 으로 넓어지면 rehype-shiki 옵션 타입과 안 맞는다
  defaultColor: false as const,
  cssVariablePrefix: '--shiki-',
}

export async function renderMarkdown(markdown: string): Promise<{
  html: string
  toc: TocItem[]
}> {
  const toc: TocItem[] = []

  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(collectHeadings(toc))
    .use(rehypeShiki, shikiOptions)
    .use(rehypeStringify)
    .process(markdown)

  return { html: String(file), toc }
}

/** 검색 결과·OG 이미지처럼 서식이 필요 없는 곳에 쓰는 평문 변환. */
export function toPlainText(markdown: string, maxLength = 200): string {
  const plain = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return plain.length > maxLength ? `${plain.slice(0, maxLength - 1)}…` : plain
}
