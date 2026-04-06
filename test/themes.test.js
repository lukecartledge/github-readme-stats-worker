import { describe, it, expect } from 'vitest'
import { themes } from '../themes/index.js'

describe('themes', () => {
  it('exports an object', () => {
    expect(typeof themes).toBe('object')
  })

  it('has a "default" theme', () => {
    expect(themes).toHaveProperty('default')
  })

  it('default theme has all required color keys', () => {
    const required = ['title_color', 'icon_color', 'text_color', 'bg_color']
    for (const key of required) {
      expect(themes.default).toHaveProperty(key)
    }
  })

  it('all themes have at least title_color, icon_color, text_color, bg_color', () => {
    const required = ['title_color', 'icon_color', 'text_color', 'bg_color']
    for (const [name, theme] of Object.entries(themes)) {
      for (const key of required) {
        expect(theme, `theme "${name}" missing "${key}"`).toHaveProperty(key)
      }
    }
  })

  it('all color values are non-empty strings', () => {
    const colorKeys = ['title_color', 'icon_color', 'text_color', 'bg_color']
    for (const [name, theme] of Object.entries(themes)) {
      for (const key of colorKeys) {
        const value = theme[key]
        expect(typeof value, `theme "${name}".${key}`).toBe('string')
        expect(value.length, `theme "${name}".${key} is empty`).toBeGreaterThan(0)
      }
    }
  })

  it('contains well-known themes', () => {
    const knownThemes = ['dark', 'radical', 'dracula', 'tokyonight', 'nord', 'github_dark']
    for (const name of knownThemes) {
      expect(themes, `missing theme "${name}"`).toHaveProperty(name)
    }
  })

  it('ambient_gradient has comma-separated bg_color for gradient', () => {
    expect(themes.ambient_gradient.bg_color).toContain(',')
  })
})
