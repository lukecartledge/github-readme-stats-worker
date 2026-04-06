import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchTopLanguages } from '../../src/fetchers/top-languages.js'

vi.mock('../../src/common/retryer.js', () => ({
  retryer: vi.fn(),
  RETRIES: 0,
}))

vi.mock('../../src/common/log.js', () => ({
  logger: { log: vi.fn(), error: vi.fn() },
  default: { log: vi.fn(), error: vi.fn() },
}))

const { retryer } = await import('../../src/common/retryer.js')

const mockLangResponse = (repos = []) => ({
  data: {
    data: {
      user: {
        repositories: {
          nodes: repos,
        },
      },
    },
  },
})

const makeRepo = (name, languages) => ({
  name,
  languages: {
    edges: languages.map(([langName, size, color]) => ({
      size,
      node: { name: langName, color: color || '#000' },
    })),
  },
})

describe('fetchTopLanguages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws for missing username', async () => {
    await expect(fetchTopLanguages('')).rejects.toThrow()
  })

  it('returns language data sorted by size', async () => {
    retryer.mockResolvedValue(
      mockLangResponse([
        makeRepo('repo1', [
          ['JavaScript', 5000, '#f1e05a'],
          ['CSS', 2000, '#563d7c'],
        ]),
        makeRepo('repo2', [['JavaScript', 3000, '#f1e05a']]),
      ]),
    )

    const langs = await fetchTopLanguages('testuser')
    const keys = Object.keys(langs)

    expect(keys[0]).toBe('JavaScript')
    expect(langs.JavaScript.size).toBeGreaterThan(langs.CSS.size)
    expect(langs.JavaScript.color).toBe('#f1e05a')
  })

  it('excludes specified repositories', async () => {
    retryer.mockResolvedValue(
      mockLangResponse([
        makeRepo('repo1', [['JavaScript', 5000]]),
        makeRepo('excluded-repo', [['Python', 10000]]),
      ]),
    )

    const langs = await fetchTopLanguages('testuser', ['excluded-repo'])
    expect(langs).not.toHaveProperty('Python')
    expect(langs).toHaveProperty('JavaScript')
  })

  it('aggregates language sizes across repos', async () => {
    retryer.mockResolvedValue(
      mockLangResponse([
        makeRepo('repo1', [['JavaScript', 3000]]),
        makeRepo('repo2', [['JavaScript', 2000]]),
      ]),
    )

    const langs = await fetchTopLanguages('testuser')
    expect(langs.JavaScript.size).toBe(5000)
  })

  it('handles repos with no languages', async () => {
    retryer.mockResolvedValue(
      mockLangResponse([makeRepo('empty-repo', []), makeRepo('repo1', [['Rust', 1000]])]),
    )

    const langs = await fetchTopLanguages('testuser')
    expect(langs).toHaveProperty('Rust')
  })

  it('throws USER_NOT_FOUND for NOT_FOUND error', async () => {
    retryer.mockResolvedValue({
      data: {
        errors: [{ type: 'NOT_FOUND', message: 'Could not resolve to a User' }],
      },
    })

    await expect(fetchTopLanguages('nonexistent')).rejects.toThrow('Could not resolve to a User')
  })

  it('throws for null API response', async () => {
    retryer.mockResolvedValue({
      data: null,
      status: 502,
      statusText: 'Bad Gateway',
    })

    await expect(fetchTopLanguages('testuser')).rejects.toThrow('GitHub API returned HTTP 502')
  })
})
