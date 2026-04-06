import { describe, it, expect } from 'vitest'
import { icons, rankIcon } from '../../src/common/icons.js'

describe('icons', () => {
  it('exports an object with known icon keys', () => {
    expect(icons).toHaveProperty('star')
    expect(icons).toHaveProperty('commits')
    expect(icons).toHaveProperty('prs')
    expect(icons).toHaveProperty('issues')
    expect(icons).toHaveProperty('fork')
    expect(icons).toHaveProperty('contribs')
  })

  it('each icon value is a string containing SVG path', () => {
    for (const [_key, value] of Object.entries(icons)) {
      expect(typeof value).toBe('string')
      expect(value).toContain('<path')
    }
  })
})

describe('rankIcon', () => {
  it('returns github icon SVG for "github" type', () => {
    const result = rankIcon('github', 'S', 1)
    expect(result).toContain('data-testid="github-rank-icon"')
    expect(result).toContain('viewBox="0 0 16 16"')
  })

  it('returns percentile text for "percentile" type', () => {
    const result = rankIcon('percentile', 'A+', 12.5)
    expect(result).toContain('Top')
    expect(result).toContain('12.5%')
    expect(result).toContain('data-testid="percentile-top-header"')
    expect(result).toContain('data-testid="percentile-rank-value"')
  })

  it('returns level text for "default" type', () => {
    const result = rankIcon('default', 'B+', 50)
    expect(result).toContain('B+')
    expect(result).toContain('data-testid="level-rank-icon"')
  })

  it('returns level text for unknown type (falls through to default)', () => {
    const result = rankIcon('unknown', 'A', 25)
    expect(result).toContain('A')
    expect(result).toContain('data-testid="level-rank-icon"')
  })
})
