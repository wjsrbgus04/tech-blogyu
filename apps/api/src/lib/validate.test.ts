import { HTTPException } from 'hono/http-exception'
import { describe, expect, it } from 'vitest'
import { validationHook } from './validate'

function issue(path: string[], message: string) {
  return { success: false as const, error: { issues: [{ path, message }] } }
}

describe('validationHook', () => {
  it('통과하면 아무 일도 하지 않는다', () => {
    expect(() => validationHook({ success: true })).not.toThrow()
  })

  it('필드명을 한국어로 바꿔 한 줄로 알려준다', () => {
    try {
      validationHook(issue(['excerpt'], '요약을 입력해 주세요.'))
      expect.unreachable('예외가 나야 한다')
    } catch (error) {
      expect(error).toBeInstanceOf(HTTPException)
      expect((error as HTTPException).status).toBe(400)
      expect((error as HTTPException).message).toBe('요약: 요약을 입력해 주세요.')
    }
  })

  it('배열 인덱스는 필드명에서 뺀다', () => {
    try {
      validationHook(issue(['tags', '0'], '빈 태그는 넣을 수 없습니다.'))
    } catch (error) {
      // path 에 숫자 인덱스가 섞여도 "태그: ..." 로 읽히게 한다
      expect((error as HTTPException).message).toContain('태그')
    }
  })

  it('모르는 필드는 키를 그대로 쓴다', () => {
    try {
      validationHook(issue(['unknownField'], '형식 오류'))
    } catch (error) {
      expect((error as HTTPException).message).toBe('unknownField: 형식 오류')
    }
  })
})
