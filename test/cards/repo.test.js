import { describe, it, expect } from 'vitest'
import { renderRepoCard } from '../../src/cards/repo.js'

const mockRepo = {
  name: 'test-repo',
  nameWithOwner: 'testuser/test-repo',
  description: 'A cool test repository for testing',
  primaryLanguage: { color: '#f1e05a', id: 'lang1', name: 'JavaScript' },
  isArchived: false,
  isTemplate: false,
  starCount: 42,
  forkCount: 10,
}

describe('renderRepoCard', () => {
  it('renders valid SVG', () => {
    const svg = renderRepoCard(mockRepo)
    expect(svg).toContain('<svg')
    expect(svg).toContain('</svg>')
  })

  it('displays repo name as title', () => {
    const svg = renderRepoCard(mockRepo)
    expect(svg).toContain('test-repo')
  })

  it('displays owner/name when show_owner is true', () => {
    const svg = renderRepoCard(mockRepo, { show_owner: true })
    expect(svg).toContain('testuser/test-repo')
  })

  it('displays description', () => {
    const svg = renderRepoCard(mockRepo)
    expect(svg).toContain('cool test repository')
  })

  it('displays default description when none provided', () => {
    const svg = renderRepoCard({ ...mockRepo, description: null })
    expect(svg).toContain('No description provided')
  })

  it('displays star count', () => {
    const svg = renderRepoCard(mockRepo)
    expect(svg).toContain('42')
  })

  it('displays fork count', () => {
    const svg = renderRepoCard(mockRepo)
    expect(svg).toContain('10')
  })

  it('displays language name', () => {
    const svg = renderRepoCard(mockRepo)
    expect(svg).toContain('JavaScript')
  })

  it('displays language color', () => {
    const svg = renderRepoCard(mockRepo)
    expect(svg).toContain('#f1e05a')
  })

  it('handles repo without primary language', () => {
    const svg = renderRepoCard({ ...mockRepo, primaryLanguage: null })
    expect(svg).toContain('<svg')
    expect(svg).not.toContain('#f1e05a')
  })

  it('shows archived badge when repo is archived', () => {
    const svg = renderRepoCard({ ...mockRepo, isArchived: true })
    expect(svg).toContain('data-testid="badge"')
  })

  it('shows template badge when repo is a template', () => {
    const svg = renderRepoCard({ ...mockRepo, isTemplate: true })
    expect(svg).toContain('data-testid="badge"')
  })

  it('does not show badge for normal repos', () => {
    const svg = renderRepoCard(mockRepo)
    expect(svg).not.toContain('data-testid="badge"')
  })

  it('respects hide_border option', () => {
    const svg = renderRepoCard(mockRepo, { hide_border: true })
    expect(svg).toContain('<svg')
  })

  it('truncates long repo names', () => {
    const longName = 'a'.repeat(50)
    const svg = renderRepoCard({ ...mockRepo, name: longName })
    expect(svg).toContain('...')
  })

  it('applies theme colors', () => {
    const svg = renderRepoCard(mockRepo, { theme: 'dark' })
    expect(svg).toContain('<svg')
  })

  it('applies custom colors', () => {
    const svg = renderRepoCard(mockRepo, {
      title_color: 'ff0000',
      text_color: '00ff00',
      bg_color: '0000ff',
      border_color: 'ffffff',
    })
    expect(svg).toContain('<svg')
  })

  it('formats large star counts with kFormatter', () => {
    const svg = renderRepoCard({ ...mockRepo, starCount: 15000 })
    expect(svg).toContain('15k')
  })

  it('limits description lines', () => {
    const longDesc = 'word '.repeat(100)
    const svg = renderRepoCard(
      { ...mockRepo, description: longDesc },
      { description_lines_count: 1 },
    )
    expect(svg).toContain('<svg')
  })

  it('supports locale option', () => {
    const svg = renderRepoCard(mockRepo, { locale: 'de' })
    expect(svg).toContain('<svg')
  })
})
