import { describe, it, expect } from 'vitest'
import { kFormatter, formatBytes, wrapTextMultiline } from '../../src/common/fmt.js'

describe('kFormatter', () => {
  it('returns numbers below 1000 as-is', () => {
    expect(kFormatter(999)).toBe(999)
    expect(kFormatter(0)).toBe(0)
  })

  it('formats numbers >= 1000 with k suffix', () => {
    expect(kFormatter(1000)).toBe('1k')
    expect(kFormatter(1500)).toBe('1.5k')
    expect(kFormatter(10000)).toBe('10k')
  })

  it('handles negative numbers', () => {
    expect(kFormatter(-999)).toBe(-999)
    expect(kFormatter(-1500)).toBe('-1.5k')
  })

  it('uses fixed precision when provided', () => {
    expect(kFormatter(1234, 2)).toBe('1.23k')
    expect(kFormatter(500, 1)).toBe('0.5k')
  })

  it('applies precision even for numbers < 1000 when precision is set', () => {
    expect(kFormatter(500, 2)).toBe('0.50k')
  })
})

describe('formatBytes', () => {
  it('formats 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 B')
  })

  it('formats bytes', () => {
    expect(formatBytes(500)).toBe('500.0 B')
  })

  it('formats kilobytes', () => {
    expect(formatBytes(1024)).toBe('1.0 KB')
  })

  it('formats megabytes', () => {
    expect(formatBytes(1048576)).toBe('1.0 MB')
  })

  it('formats gigabytes', () => {
    expect(formatBytes(1073741824)).toBe('1.0 GB')
  })

  it('throws for negative bytes', () => {
    expect(() => formatBytes(-1)).toThrow('Bytes must be a non-negative number')
  })
})

describe('wrapTextMultiline', () => {
  it('returns single-element array for short text', () => {
    const result = wrapTextMultiline('Hello')
    expect(result).toHaveLength(1)
    expect(result[0]).toBe('Hello')
  })

  it('wraps long text into multiple lines', () => {
    const longText =
      'This is a very long text that should definitely be wrapped across multiple lines when processed'
    const result = wrapTextMultiline(longText, 20)
    expect(result.length).toBeGreaterThan(1)
  })

  it('respects maxLines parameter', () => {
    const longText =
      'This is a very long text that should definitely be wrapped across multiple lines when processed by the function'
    const result = wrapTextMultiline(longText, 20, 2)
    expect(result.length).toBeLessThanOrEqual(2)
  })

  it('adds ellipsis when text exceeds maxLines', () => {
    const longText =
      'This is a very long text that should definitely be wrapped across multiple lines when processed by the function'
    const result = wrapTextMultiline(longText, 20, 2)
    expect(result[result.length - 1]).toContain('...')
  })

  it('handles Chinese text with full-width commas', () => {
    const chineseText = '你好，世界，测试'
    const result = wrapTextMultiline(chineseText)
    expect(result.length).toBeGreaterThan(0)
  })
})
