import type { ThemeRegistrationRaw } from 'shiki'

/**
 * 코드 하이라이팅 테마.
 *
 * 기성 테마(github-dark 등)는 빨강·파랑·보라를 함께 써서 모노크롬 아트디렉션과 충돌한다.
 * 그래서 시안에서 정한 규칙을 그대로 옮긴 테마를 만든다.
 *
 *   키워드 → 액센트(라임)   문자열 → 뉴트럴   주석 → faint   나머지 → 본문색
 *
 * 값은 tokens.css 의 oklch 를 sRGB 로 변환한 것이다. 팔레트를 바꾸면 여기도 같이 고친다.
 */

type Palette = {
  base: string
  ident: string
  keyword: string
  string: string
  comment: string
  punctuation: string
}

function build(name: string, type: 'light' | 'dark', c: Palette): ThemeRegistrationRaw {
  return {
    name,
    type,
    settings: [
      { settings: { foreground: c.base } },
      {
        scope: ['comment', 'punctuation.definition.comment', 'string.comment'],
        settings: { foreground: c.comment, fontStyle: 'italic' },
      },
      {
        scope: [
          'keyword',
          'keyword.control',
          'keyword.operator.new',
          'keyword.operator.expression',
          'storage',
          'storage.type',
          'storage.modifier',
          'constant.language',
          'variable.language',
          'support.type.primitive',
        ],
        settings: { foreground: c.keyword },
      },
      {
        scope: ['string', 'string.quoted', 'string.template', 'constant.other.symbol'],
        settings: { foreground: c.string },
      },
      {
        scope: [
          'entity.name.function',
          'support.function',
          'entity.name.type',
          'entity.name.class',
          'support.class',
          'variable.other.constant',
        ],
        settings: { foreground: c.ident },
      },
      {
        scope: ['punctuation', 'meta.brace', 'keyword.operator'],
        settings: { foreground: c.punctuation },
      },
      {
        // 숫자·불리언은 문자열과 같은 급으로 둔다 — 색을 더 늘리지 않는다
        scope: ['constant.numeric', 'constant.language.boolean'],
        settings: { foreground: c.string },
      },
    ],
  }
}

export const codeThemeLight = build('blogyu-light', 'light', {
  base: '#5C5F64',
  ident: '#111215',
  keyword: '#527410',
  string: '#56595E',
  comment: '#6E7075',
  punctuation: '#84878C',
})

export const codeThemeDark = build('blogyu-dark', 'dark', {
  base: '#999BA0',
  ident: '#EDEEF1',
  keyword: '#BBEF39',
  string: '#C8CACE',
  comment: '#85888D',
  punctuation: '#75787D',
})
