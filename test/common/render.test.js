import { describe, it, expect } from 'vitest'
import {
  flexLayout,
  createLanguageNode,
  createProgressNode,
  iconWithLabel,
  renderError,
  measureText,
  ERROR_CARD_LENGTH,
} from '../../src/common/render.js'

describe('flexLayout', () => {
  it('wraps items in g tags with row transforms', () => {
    const result = flexLayout({ items: ['a', 'b'], gap: 10, sizes: [20, 20] })
    expect(result).toHaveLength(2)
    expect(result[0]).toContain('translate(0, 0)')
    expect(result[1]).toContain('translate(30, 0)')
  })

  it('applies column direction transforms', () => {
    const result = flexLayout({ items: ['a', 'b'], gap: 10, direction: 'column', sizes: [20, 20] })
    expect(result[0]).toContain('translate(0, 0)')
    expect(result[1]).toContain('translate(0, 30)')
  })

  it('filters out empty strings', () => {
    const result = flexLayout({ items: ['a', '', 'b'], gap: 10, sizes: [20, 20, 20] })
    expect(result).toHaveLength(2)
  })

  it('handles empty items array', () => {
    const result = flexLayout({ items: [], gap: 10 })
    expect(result).toEqual([])
  })
})

describe('createLanguageNode', () => {
  it('returns SVG with language name and color', () => {
    const result = createLanguageNode('JavaScript', '#f1e05a')
    expect(result).toContain('JavaScript')
    expect(result).toContain('#f1e05a')
    expect(result).toContain('data-testid="primary-lang"')
  })
})

describe('createProgressNode', () => {
  it('returns SVG progress bar with clamped percentage', () => {
    const result = createProgressNode({
      x: 0,
      y: 0,
      width: 300,
      color: '#ff0000',
      progress: 75,
      progressBarBackgroundColor: '#ddd',
      delay: 0,
    })
    expect(result).toContain('width="75%"')
    expect(result).toContain('fill="#ff0000"')
    expect(result).toContain('data-testid="lang-progress"')
  })

  it('clamps progress to minimum 2%', () => {
    const result = createProgressNode({
      x: 0,
      y: 0,
      width: 300,
      color: '#ff0000',
      progress: 0,
      progressBarBackgroundColor: '#ddd',
      delay: 0,
    })
    expect(result).toContain('width="2%"')
  })
})

describe('iconWithLabel', () => {
  it('returns SVG icon with text label', () => {
    const result = iconWithLabel('<path d="M0 0"/>', 42, 'test-id', 16)
    expect(result).toContain('<path d="M0 0"/>')
    expect(result).toContain('42')
    expect(result).toContain('data-testid="test-id"')
  })

  it('returns empty string when label is 0 or negative', () => {
    expect(iconWithLabel('<path/>', 0, 'id', 16)).toBe('')
    expect(iconWithLabel('<path/>', -1, 'id', 16)).toBe('')
  })

  it('renders string labels regardless of value', () => {
    const result = iconWithLabel('<path/>', 'N/A', 'id', 16)
    expect(result).toContain('N/A')
  })
})

describe('renderError', () => {
  it('renders an error card SVG', () => {
    const result = renderError({ message: 'Test error' })
    expect(result).toContain('Something went wrong!')
    expect(result).toContain('Test error')
    expect(result).toContain(`width="${ERROR_CARD_LENGTH}"`)
  })

  it('hides repo link when show_repo_link is false', () => {
    const result = renderError({
      message: 'Error',
      secondaryMessage: 'some detail',
      renderOptions: { show_repo_link: false },
    })
    expect(result).not.toContain('file an issue')
  })

  it('respects theme option', () => {
    const result = renderError({
      message: 'Error',
      renderOptions: { theme: 'dark' },
    })
    expect(result).toContain('svg')
  })
})

describe('measureText', () => {
  it('returns a number for any string', () => {
    expect(typeof measureText('Hello')).toBe('number')
  })

  it('longer strings produce larger measurements', () => {
    expect(measureText('Hello World')).toBeGreaterThan(measureText('Hi'))
  })

  it('scales with font size', () => {
    const small = measureText('Test', 10)
    const large = measureText('Test', 20)
    expect(large).toBeCloseTo(small * 2, 5)
  })

  it('handles empty single character', () => {
    expect(measureText('a')).toBeGreaterThan(0)
  })
})
