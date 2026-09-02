import type { ThemeRegistrationRaw } from 'shiki'

/**
 * 코드 하이라이팅 테마.
 *
 * 기성 테마(github-light 등)는 빨강·파랑·보라를 함께 써서 "잉크 + 마젠타 한 색"
 * 아트디렉션과 충돌한다. 그래서 docs/design 의 규칙을 그대로 옮긴 테마를 만든다.
 *
 *   키워드 → 마젠타(잉크로만)   식별자 → 검정   문자열·숫자 → 진회색   주석 → 회색
 *
 * 사이트가 라이트 전용이라 테마도 한 벌이다.
 */

type Palette = {
  base: string
  ident: string
  keyword: string
  string: string
  comment: string
  punctuation: string
}

function build(name: string, type: 'light', c: Palette): ThemeRegistrationRaw & { name: string } {
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

export const codeTheme = build('blogyu', 'light', {
  base: '#303030',
  ident: '#000000',
  keyword: '#ff00bc',
  string: '#4a4a4a',
  comment: '#7a7a7a',
  punctuation: '#6b6b6b',
})
