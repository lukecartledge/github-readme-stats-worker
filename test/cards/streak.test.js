import { describe, expect, it } from 'vitest'

import { renderStreakCard } from '../../src/cards/streak.js'

const mockStreak = {
  totalContributions: 1245,
  firstContribution: '2021-03-12',
  currentStreak: {
    start: '2024-09-01',
    end: '2024-09-10',
    length: 10,
  },
  longestStreak: {
    start: '2023-01-01',
    end: '2023-02-15',
    length: 46,
  },
}

describe('renderStreakCard', () => {
  it('renders valid SVG with three columns and card shell', () => {
    const svg = renderStreakCard(mockStreak)

    expect(svg).toContain('<svg')
    expect(svg).toContain('data-testid="card-bg"')
    expect(svg).toContain('Contribution Streak')
    expect(svg).toContain('Total Contributions')
    expect(svg).toContain('Current Streak')
    expect(svg).toContain('Longest Streak')
    expect(svg).toContain('1245')
    expect(svg).toContain('46')
  })

  it('supports theme and color overrides', () => {
    const svg = renderStreakCard(mockStreak, {
      theme: 'radical',
      title_color: 'ff00aa',
      text_color: '00ffaa',
      bg_color: '111111',
      border_color: 'ffffff',
    })

    expect(svg).toContain('fill: #ff00aa')
    expect(svg).toContain('fill: #00ffaa')
    expect(svg).toContain('fill="#111111"')
    expect(svg).toContain('stroke="#ffffff"')
  })

  it('respects hide_border option', () => {
    const svg = renderStreakCard(mockStreak, {
      hide_border: true,
    })

    expect(svg).toContain('stroke-opacity="0"')
  })

  it('disables animations when requested', () => {
    const svg = renderStreakCard(mockStreak, {
      disable_animations: true,
    })

    expect(svg).toContain('animation-duration: 0s !important')
  })

  it('renders no-streak state text safely', () => {
    const svg = renderStreakCard(
      {
        totalContributions: 0,
        firstContribution: '',
        currentStreak: { start: '', end: '', length: 0 },
        longestStreak: { start: '', end: '', length: 0 },
      },
      {
        locale: 'en-US',
      },
    )

    expect(svg).toContain('No active streak')
    expect(svg).toContain('No streak recorded')
    expect(svg).toContain('No contributions yet')
  })

  it('throws a render error for invalid data input', () => {
    expect(() => renderStreakCard(null)).toThrow('Could not render streak card.')
  })
})
