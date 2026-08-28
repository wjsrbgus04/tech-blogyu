import rehypeShikiFromHighlighter from '@shikijs/rehype/core'
import type { Root } from 'hast'
import { toString as hastToString } from 'hast-util-to-string'
import rehypeSlug from 'rehype-slug'
import rehypeStringify from 'rehype-stringify'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { createHighlighterCore } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import bash from 'shiki/langs/bash.mjs'
import css from 'shiki/langs/css.mjs'
import diff from 'shiki/langs/diff.mjs'
import html from 'shiki/langs/html.mjs'
import javascript from 'shiki/langs/javascript.mjs'
import json from 'shiki/langs/json.mjs'
import jsonc from 'shiki/langs/jsonc.mjs'
import markdownLang from 'shiki/langs/markdown.mjs'
import sql from 'shiki/langs/sql.mjs'
import toml from 'shiki/langs/toml.mjs'
import tsx from 'shiki/langs/tsx.mjs'
import typescript from 'shiki/langs/typescript.mjs'
import yaml from 'shiki/langs/yaml.mjs'
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
  themes: { light: codeThemeLight.name, dark: codeThemeDark.name },
  // false 로 좁혀둔다 — boolean 으로 넓어지면 rehype-shiki 옵션 타입과 안 맞는다
  defaultColor: false as const,
  cssVariablePrefix: '--shiki-',
}

/**
 * 하이라이터를 직접 조립한다. `@shikijs/rehype` 를 그냥 쓰면 언어 문법
 * 261개와 테마 65개가 통째로 번들에 들어가고, 그것만으로 Workers 무료 플랜의
 * 3MiB(gzip) 한도를 넘긴다. 그래서 이 블로그가 쓰는 언어만 싣는다.
 * (next.config.ts 의 transpilePackages 와 짝이다 — 둘 중 하나만 빠져도 소용없다.)
 *
 * 목록에 없는 언어로 코드펜스를 열면 하이라이팅 없이 평문으로 나온다.
 * 새 언어가 필요하면 위에 import 를 추가하고 여기 배열에 넣는다.
 */
const languages = [
  typescript,
  tsx,
  javascript,
  json,
  jsonc,
  sql,
  yaml,
  bash,
  css,
  html,
  diff,
  markdownLang,
  toml,
]

let highlighter: ReturnType<typeof createHighlighterCore> | null = null

/** 문법 로딩이 비싸므로 한 번만 만들어 재사용한다. */
function getHighlighter() {
  highlighter ??= createHighlighterCore({
    themes: [codeThemeLight, codeThemeDark],
    langs: languages,
    // JS 정규식 엔진을 쓰면 oniguruma 의 onig.wasm(466KB)을 싣지 않아도 된다.
    engine: createJavaScriptRegexEngine(),
  })
  return highlighter
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
    // createHighlighterCore 의 반환 타입(HighlighterCore)과 플러그인이 받는
    // HighlighterGeneric<any, any> 는 shiki 쪽 제네릭 변성 때문에 서로 안 맞는다.
    // 런타임 형태는 같으므로 플러그인이 선언한 타입으로 맞춰준다.
    .use(
      rehypeShikiFromHighlighter,
      (await getHighlighter()) as Parameters<typeof rehypeShikiFromHighlighter>[0],
      shikiOptions,
    )
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
