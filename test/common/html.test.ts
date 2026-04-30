import { describe, it, expect } from 'vitest'
import { encodeHTML } from '../../src/common/html.js'

describe('encodeHTML', () => {
  it('encodes HTML special characters', () => {
    expect(encodeHTML('<script>')).toBe('&#60;script&#62;')
    expect(encodeHTML('a&b')).toBe('a&#38;b')
  })

  it('encodes non-ASCII characters', () => {
    const result = encodeHTML('Caf\u00e9')
    expect(result).toContain('&#')
    expect(result).not.toContain('\u00e9')
  })

  it('preserves HTML entities (does not double-encode)', () => {
    expect(encodeHTML('&#60;')).toBe('&#60;')
  })

  it('strips backspace characters', () => {
    expect(encodeHTML('hello\u0008world')).toBe('helloworld')
  })

  it('handles empty string', () => {
    expect(encodeHTML('')).toBe('')
  })

  it('handles plain ASCII text', () => {
    expect(encodeHTML('Hello World')).toBe('Hello World')
  })
})
