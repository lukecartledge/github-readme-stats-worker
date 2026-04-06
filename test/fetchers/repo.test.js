import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchRepo } from '../../src/fetchers/repo.js'

vi.mock('../../src/common/retryer.js', () => ({
  retryer: vi.fn(),
  RETRIES: 0,
}))

const { retryer } = await import('../../src/common/retryer.js')

const mockRepoData = {
  name: 'test-repo',
  nameWithOwner: 'testuser/test-repo',
  isPrivate: false,
  isArchived: false,
  isTemplate: false,
  stargazers: { totalCount: 42 },
  description: 'A test repository',
  primaryLanguage: { color: '#f1e05a', id: 'lang1', name: 'JavaScript' },
  forkCount: 10,
}

const mockUserResponse = (repoOverrides = {}) => ({
  data: {
    data: {
      user: {
        repository: { ...mockRepoData, ...repoOverrides },
      },
      organization: null,
    },
  },
})

const mockOrgResponse = (repoOverrides = {}) => ({
  data: {
    data: {
      user: null,
      organization: {
        repository: { ...mockRepoData, ...repoOverrides },
      },
    },
  },
})

describe('fetchRepo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws for missing username and repo', async () => {
    await expect(fetchRepo('', '')).rejects.toThrow()
  })

  it('throws for missing username', async () => {
    await expect(fetchRepo('', 'repo')).rejects.toThrow()
  })

  it('throws for missing repo', async () => {
    await expect(fetchRepo('user', '')).rejects.toThrow()
  })

  it('returns repo data for user repository', async () => {
    retryer.mockResolvedValue(mockUserResponse())
    const env = { GH_PAT_1: 'token' }

    const repo = await fetchRepo('testuser', 'test-repo', env)

    expect(repo.name).toBe('test-repo')
    expect(repo.nameWithOwner).toBe('testuser/test-repo')
    expect(repo.starCount).toBe(42)
    expect(repo.forkCount).toBe(10)
    expect(repo.description).toBe('A test repository')
    expect(repo.primaryLanguage.name).toBe('JavaScript')
  })

  it('returns repo data for organization repository', async () => {
    retryer.mockResolvedValue(mockOrgResponse())

    const repo = await fetchRepo('testorg', 'test-repo')

    expect(repo.name).toBe('test-repo')
    expect(repo.starCount).toBe(42)
  })

  it('throws when user and organization are both null', async () => {
    retryer.mockResolvedValue({
      data: { data: { user: null, organization: null } },
    })

    await expect(fetchRepo('unknown', 'repo')).rejects.toThrow('Not found')
  })

  it('throws when user repository is null', async () => {
    retryer.mockResolvedValue({
      data: {
        data: {
          user: { repository: null },
          organization: null,
        },
      },
    })

    await expect(fetchRepo('testuser', 'nonexistent')).rejects.toThrow('User Repository Not found')
  })

  it('throws when user repository is private', async () => {
    retryer.mockResolvedValue(mockUserResponse({ isPrivate: true }))

    await expect(fetchRepo('testuser', 'private-repo')).rejects.toThrow('User Repository Not found')
  })

  it('throws when org repository is null', async () => {
    retryer.mockResolvedValue({
      data: {
        data: {
          user: null,
          organization: { repository: null },
        },
      },
    })

    await expect(fetchRepo('testorg', 'nonexistent')).rejects.toThrow(
      'Organization Repository Not found',
    )
  })

  it('throws when org repository is private', async () => {
    retryer.mockResolvedValue(mockOrgResponse({ isPrivate: true }))

    await expect(fetchRepo('testorg', 'private-repo')).rejects.toThrow(
      'Organization Repository Not found',
    )
  })

  it('passes env to retryer', async () => {
    retryer.mockResolvedValue(mockUserResponse())
    const env = { GH_PAT_1: 'my-token' }

    await fetchRepo('testuser', 'test-repo', env)

    expect(retryer).toHaveBeenCalledWith(
      expect.any(Function),
      { login: 'testuser', repo: 'test-repo' },
      env,
    )
  })

  it('handles both user and org returning data (prefers user)', async () => {
    retryer.mockResolvedValue({
      data: {
        data: {
          user: {
            repository: { ...mockRepoData, stargazers: { totalCount: 99 } },
          },
          organization: {
            repository: { ...mockRepoData, stargazers: { totalCount: 1 } },
          },
        },
      },
    })

    // When both exist, neither isUser nor isOrg is true → "Unexpected behavior"
    await expect(fetchRepo('testuser', 'test-repo')).rejects.toThrow('Unexpected behavior')
  })
})
