import { describe, it, expect } from 'vitest'
import { Card } from '../../src/common/Card.js'

describe('Card', () => {
  it('creates a card with default dimensions', () => {
    const card = new Card({})
    expect(card.width).toBe(100)
    expect(card.height).toBe(100)
  })

  it('accepts custom dimensions', () => {
    const card = new Card({ width: 400, height: 200 })
    expect(card.width).toBe(400)
    expect(card.height).toBe(200)
  })

  it('uses defaultTitle when customTitle is undefined', () => {
    const card = new Card({ defaultTitle: 'My Card' })
    expect(card.title).toBe('My Card')
  })

  it('uses customTitle over defaultTitle', () => {
    const card = new Card({ defaultTitle: 'Default', customTitle: 'Custom' })
    expect(card.title).toBe('Custom')
  })

  it('HTML-encodes the title', () => {
    const card = new Card({ defaultTitle: '<script>alert("xss")</script>' })
    expect(card.title).not.toContain('<script>')
    expect(card.title).toContain('&#60;script&#62;')
  })

  describe('setHideBorder', () => {
    it('sets hideBorder flag', () => {
      const card = new Card({})
      card.setHideBorder(true)
      expect(card.hideBorder).toBe(true)
    })
  })

  describe('setHideTitle', () => {
    it('sets hideTitle and reduces height', () => {
      const card = new Card({ height: 200 })
      card.setHideTitle(true)
      expect(card.hideTitle).toBe(true)
      expect(card.height).toBe(170)
    })
  })

  describe('disableAnimations', () => {
    it('sets animations to false', () => {
      const card = new Card({})
      card.disableAnimations()
      expect(card.animations).toBe(false)
    })
  })

  describe('setAccessibilityLabel', () => {
    it('sets a11y title and desc', () => {
      const card = new Card({})
      card.setAccessibilityLabel({ title: 'Stats', desc: 'GitHub stats' })
      expect(card.a11yTitle).toBe('Stats')
      expect(card.a11yDesc).toBe('GitHub stats')
    })
  })

  describe('setCSS', () => {
    it('stores custom CSS', () => {
      const card = new Card({})
      card.setCSS('.custom { color: red; }')
      expect(card.css).toBe('.custom { color: red; }')
    })
  })

  describe('render', () => {
    it('returns SVG string with correct structure', () => {
      const card = new Card({
        width: 300,
        height: 200,
        colors: {
          titleColor: '#fff',
          bgColor: '#000',
          borderColor: '#333',
        },
      })
      card.setAccessibilityLabel({ title: 'Test', desc: 'Test card' })
      const svg = card.render('<text>Body</text>')
      expect(svg).toContain('<svg')
      expect(svg).toContain('width="300"')
      expect(svg).toContain('height="200"')
      expect(svg).toContain('Body')
      expect(svg).toContain('data-testid="card-bg"')
      expect(svg).toContain('data-testid="main-card-body"')
    })

    it('hides title when hideTitle is true', () => {
      const card = new Card({ colors: {} })
      card.setHideTitle(true)
      const svg = card.render('<text>Body</text>')
      expect(svg).not.toContain('data-testid="card-title"')
    })

    it('shows title by default', () => {
      const card = new Card({ defaultTitle: 'Hello', colors: { titleColor: '#fff' } })
      const svg = card.render('<text>Body</text>')
      expect(svg).toContain('data-testid="card-title"')
      expect(svg).toContain('Hello')
    })

    it('disables animations when set', () => {
      const card = new Card({ colors: {} })
      card.disableAnimations()
      const svg = card.render('')
      expect(svg).toContain('animation-duration: 0s !important')
    })

    it('renders gradient for array bgColor', () => {
      const card = new Card({
        colors: { bgColor: ['45', 'ff0000', '0000ff'] },
      })
      const svg = card.render('')
      expect(svg).toContain('linearGradient')
      expect(svg).toContain('url(#gradient)')
    })

    it('hides border when hideBorder is true', () => {
      const card = new Card({ colors: {} })
      card.setHideBorder(true)
      const svg = card.render('')
      expect(svg).toContain('stroke-opacity="0"')
    })
  })

  describe('renderTitle', () => {
    it('includes prefix icon when provided', () => {
      const card = new Card({
        titlePrefixIcon: '<path d="M0 0"/>',
        defaultTitle: 'Stats',
        colors: {},
      })
      const title = card.renderTitle()
      expect(title).toContain('<path d="M0 0"/>')
      expect(title).toContain('Stats')
    })
  })
})
