import { describe, it, expect } from 'vitest'
import { isValidHexColor, isValidGradient, getCardColors } from '../../src/common/color.js'

describe('isValidHexColor', () => {
  it('accepts valid 3-char hex', () => {
    expect(isValidHexColor('fff')).toBe(true)
    expect(isValidHexColor('000')).toBe(true)
    expect(isValidHexColor('abc')).toBe(true)
  })

  it('accepts valid 4-char hex (with alpha)', () => {
    expect(isValidHexColor('ffff')).toBe(true)
    expect(isValidHexColor('000f')).toBe(true)
  })

  it('accepts valid 6-char hex', () => {
    expect(isValidHexColor('ffffff')).toBe(true)
    expect(isValidHexColor('000000')).toBe(true)
    expect(isValidHexColor('2f80ed')).toBe(true)
  })

  it('accepts valid 8-char hex (with alpha)', () => {
    expect(isValidHexColor('ffffffff')).toBe(true)
    expect(isValidHexColor('19f9d899')).toBe(true)
  })

  it('rejects invalid hex strings', () => {
    expect(isValidHexColor('gg')).toBe(false)
    expect(isValidHexColor('12345')).toBe(false)
    expect(isValidHexColor('#fff')).toBe(false)
    expect(isValidHexColor('')).toBe(false)
    expect(isValidHexColor('xyz')).toBe(false)
  })
})

describe('isValidGradient', () => {
  it('accepts valid gradient arrays (3+ elements, valid hex after first)', () => {
    expect(isValidGradient(['45', 'ff0000', '0000ff'])).toBe(true)
    expect(isValidGradient(['90', 'aabbcc', 'ddeeff', '112233'])).toBe(true)
  })

  it('rejects arrays with fewer than 3 elements', () => {
    expect(isValidGradient(['ff0000'])).toBe(false)
    expect(isValidGradient(['45', 'ff0000'])).toBe(false)
  })

  it('rejects arrays with invalid hex colors after first element', () => {
    expect(isValidGradient(['45', 'notahex', '0000ff'])).toBe(false)
  })
})

describe('getCardColors', () => {
  it('returns default theme colors when no overrides given', () => {
    const colors = getCardColors({})
    expect(colors.titleColor).toBe('#2f80ed')
    expect(colors.iconColor).toBe('#4c71f2')
    expect(colors.textColor).toBe('#434d58')
    expect(colors.bgColor).toBe('#fffefe')
    expect(colors.borderColor).toBe('#e4e2e2')
  })

  it('uses specified theme colors', () => {
    const colors = getCardColors({ theme: 'dark' })
    expect(colors.titleColor).toBe('#fff')
    expect(colors.iconColor).toBe('#79ff97')
    expect(colors.textColor).toBe('#9f9f9f')
    expect(colors.bgColor).toBe('#151515')
  })

  it('allows individual color overrides on a theme', () => {
    const colors = getCardColors({ theme: 'dark', title_color: 'ff0000' })
    expect(colors.titleColor).toBe('#ff0000')
    expect(colors.textColor).toBe('#9f9f9f')
  })

  it('throws for unknown theme names', () => {
    expect(() => getCardColors({ theme: 'nonexistent' })).toThrow()
  })

  it('ringColor falls back to titleColor when not specified', () => {
    const colors = getCardColors({})
    expect(colors.ringColor).toBe(colors.titleColor)
  })

  it('handles gradient background color', () => {
    const colors = getCardColors({ theme: 'ambient_gradient' })
    expect(Array.isArray(colors.bgColor)).toBe(true)
  })

  it('throws when non-string color is provided for non-bg fields', () => {
    expect(() => getCardColors({ title_color: '45,ff0000,0000ff' })).toThrow()
  })
})
