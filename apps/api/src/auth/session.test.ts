import { describe, expect, it } from 'vitest'
import { isAllowedAdmin } from './session'

describe('isAllowedAdmin', () => {
  it('허용 목록에 있으면 통과시킨다', () => {
    expect(isAllowedAdmin('hxxnim', 'hxxnim')).toBe(true)
    expect(isAllowedAdmin('hxxnim', 'someone,hxxnim,other')).toBe(true)
  })

  it('대소문자를 가리지 않는다 — GitHub 로그인은 대소문자를 구분하지 않는다', () => {
    expect(isAllowedAdmin('HxxNim', 'hxxnim')).toBe(true)
  })

  it('공백이 섞인 목록도 처리한다', () => {
    expect(isAllowedAdmin('hxxnim', ' someone , hxxnim , other ')).toBe(true)
  })

  it('목록에 없으면 막는다', () => {
    expect(isAllowedAdmin('stranger', 'hxxnim')).toBe(false)
  })

  it('목록이 비어 있으면 아무도 통과하지 못한다', () => {
    expect(isAllowedAdmin('hxxnim', '')).toBe(false)
    expect(isAllowedAdmin('hxxnim', '  ,  ')).toBe(false)
  })
})
