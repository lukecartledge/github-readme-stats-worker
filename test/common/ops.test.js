import { describe, it, expect } from 'vitest'
import {
  parseBoolean,
  parseArray,
  clampValue,
  lowercaseTrim,
  chunkArray,
  parseEmojis,
  dateDiff,
} from '../../src/common/ops.js'

describe('parseBoolean', () => {
  it("returns true for 'true'", () => {
    expect(parseBoolean('true')).toBe(true)
  })

  it("returns false for 'false'", () => {
    expect(parseBoolean('false')).toBe(false)
  })

  it('returns undefined for other strings', () => {
    expect(parseBoolean('yes')).toBeUndefined()
    expect(parseBoolean('1')).toBeUndefined()
    expect(parseBoolean('')).toBeUndefined()
  })

  it('returns the boolean value for actual boolean inputs', () => {
    expect(parseBoolean(true)).toBe(true)
    expect(parseBoolean(false)).toBe(false)
  })

  it('returns undefined for non-boolean non-string values', () => {
    expect(parseBoolean(undefined)).toBeUndefined()
    expect(parseBoolean(null)).toBeUndefined()
  })
})

describe('parseArray', () => {
  it('splits comma-separated strings', () => {
    expect(parseArray('a,b,c')).toEqual(['a', 'b', 'c'])
  })

  it('returns empty array for falsy input', () => {
    expect(parseArray('')).toEqual([])
    expect(parseArray(undefined)).toEqual([])
    expect(parseArray(null)).toEqual([])
  })

  it('returns single-element array for non-comma string', () => {
    expect(parseArray('hello')).toEqual(['hello'])
  })
})

describe('clampValue', () => {
  it('clamps values within range', () => {
    expect(clampValue(5, 0, 10)).toBe(5)
    expect(clampValue(-5, 0, 10)).toBe(0)
    expect(clampValue(15, 0, 10)).toBe(10)
  })

  it('returns min for NaN input', () => {
    expect(clampValue(NaN, 0, 10)).toBe(0)
  })

  it('handles equal min and max', () => {
    expect(clampValue(5, 5, 5)).toBe(5)
  })

  it('handles boundary values', () => {
    expect(clampValue(0, 0, 10)).toBe(0)
    expect(clampValue(10, 0, 10)).toBe(10)
  })
})

describe('lowercaseTrim', () => {
  it('lowercases and trims strings', () => {
    expect(lowercaseTrim('  Hello World  ')).toBe('hello world')
  })

  it('handles empty strings', () => {
    expect(lowercaseTrim('')).toBe('')
  })

  it('handles already lowercase trimmed strings', () => {
    expect(lowercaseTrim('hello')).toBe('hello')
  })
})

describe('chunkArray', () => {
  it('splits array into chunks', () => {
    expect(chunkArray([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
  })

  it('handles chunk size larger than array', () => {
    expect(chunkArray([1, 2], 5)).toEqual([[1, 2]])
  })

  it('handles empty array', () => {
    expect(chunkArray([], 3)).toEqual([])
  })

  it('handles chunk size of 1', () => {
    expect(chunkArray([1, 2, 3], 1)).toEqual([[1], [2], [3]])
  })
})

describe('parseEmojis', () => {
  it('replaces known emoji shortcodes with unicode', () => {
    const result = parseEmojis('Hello :smile: World')
    expect(result).not.toContain(':smile:')
  })

  it('replaces unknown shortcodes with empty string', () => {
    const result = parseEmojis('Hello :unknownemoji: World')
    expect(result).not.toContain(':unknownemoji:')
    expect(result).toBe('Hello  World')
  })

  it('handles strings without shortcodes', () => {
    expect(parseEmojis('Hello World')).toBe('Hello World')
  })
})

describe('dateDiff', () => {
  it('returns difference in minutes between two dates', () => {
    const d1 = new Date('2024-01-01T01:00:00Z')
    const d2 = new Date('2024-01-01T00:00:00Z')
    expect(dateDiff(d1, d2)).toBe(60)
  })

  it('returns 0 for same dates', () => {
    const d = new Date('2024-01-01T00:00:00Z')
    expect(dateDiff(d, d)).toBe(0)
  })

  it('returns positive value regardless of order', () => {
    const d1 = new Date('2024-01-01T00:00:00Z')
    const d2 = new Date('2024-01-01T02:00:00Z')
    expect(dateDiff(d2, d1)).toBe(120)
  })
})
