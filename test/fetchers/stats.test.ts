import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { fetchStats as _fetchStats } from '../../src/fetchers/stats.js'
const fetchStats = _fetchStats as (...args: unknown[]) => Promise<unknown>

vi.mock('../../src/common/retryer.js', () => ({
  retryer: vi.fn(),
  RETRIES: 0,
}))

vi.mock('../../src/common/log.js', () => ({
  logger: { log: vi.fn(), error: vi.fn() },
  default: { log: vi.fn(), error: vi.fn() },
}))

const { retryer: _retryer } = await import('../../src/common/retryer.js')
const retryer = _retryer as unknown as Mock

const mockUserResponse = (overrides = {}) => ({
  data: {
    data: {
      user: {
        name: 'Test User',
        login: 'testuser',
        commits: { totalCommitContributions: 500 },
        reviews: { totalPullRequestReviewContributions: 20 },
        repositoriesContributedTo: { totalCount: 30 },
        pullRequests: { totalCount: 100 },
        mergedPullRequests: { totalCount: 80 },
        openIssues: { totalCount: 10 },
        closedIssues: { totalCount: 15 },
        followers: { totalCount: 50 },
        repositoryDiscussions: { totalCount: 5 },
        repositoryDiscussionComments: { totalCount: 3 },
        repositories: {
          totalCount: 40,
          nodes: [
            { name: 'repo1', stargazers: { totalCount: 100 } },
            { name: 'repo2', stargazers: { totalCount: 50 } },
          ],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
        ...overrides,
      },
    },
  },
})

describe('fetchStats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws for missing username', async () => {
    await expect(fetchStats('')).rejects.toThrow()
  })

  it('returns stats object with expected fields', async () => {
    retryer.mockResolvedValue(mockUserResponse())
    const env = { GH_PAT_1: 'token' }

    const stats = await fetchStats('testuser', false, [], false, false, false, undefined, env) as Record<string, unknown>

    expect(stats).toHaveProperty('name', 'Test User')
    expect(stats).toHaveProperty('totalPRs', 100)
    expect(stats).toHaveProperty('totalCommits', 500)
    expect(stats).toHaveProperty('totalIssues', 25)
    expect(stats).toHaveProperty('totalStars', 150)
    expect(stats).toHaveProperty('contributedTo', 30)
    expect(stats).toHaveProperty('rank')
    expect(stats.rank).toHaveProperty('level')
    expect(stats.rank).toHaveProperty('percentile')
  })

  it('uses login as name when name is null', async () => {
    retryer.mockResolvedValue(mockUserResponse({ name: null }))
    const stats = await fetchStats('testuser') as Record<string, unknown>
    expect(stats.name).toBe('testuser')
  })

  it('excludes specified repositories from star count', async () => {
    retryer.mockResolvedValue(mockUserResponse())

    const stats = await fetchStats('testuser', false, ['repo1']) as Record<string, unknown>
    expect(stats.totalStars).toBe(50)
  })

  it('throws USER_NOT_FOUND for NOT_FOUND error', async () => {
    retryer.mockResolvedValue({
      data: {
        errors: [{ type: 'NOT_FOUND', message: 'Could not resolve to a User' }],
      },
    })

    await expect(fetchStats('nonexistent')).rejects.toThrow('Could not resolve to a User')
  })

  it('throws for null API response', async () => {
    retryer.mockResolvedValue({
      data: null,
      status: 502,
      statusText: 'Bad Gateway',
    })

    await expect(fetchStats('testuser')).rejects.toThrow('GitHub API returned HTTP 502')
  })

  it('throws for generic GraphQL errors', async () => {
    retryer.mockResolvedValue({
      data: {
        errors: [{ type: 'SOME_ERROR' }],
      },
    })

    await expect(fetchStats('testuser')).rejects.toThrow('Something went wrong')
  })

  it('calculates merged PRs percentage when included', async () => {
    retryer.mockResolvedValue(mockUserResponse())

    const stats = await fetchStats('testuser', false, [], true, false, false, undefined, {}) as Record<string, unknown>

    expect(stats.totalPRsMerged).toBe(80)
    expect(stats.mergedPRsPercentage).toBe(80)
  })

  it('includes discussions counts when enabled', async () => {
    retryer.mockResolvedValue(mockUserResponse())

    const stats = await fetchStats('testuser', false, [], false, true, true, undefined, {}) as Record<string, unknown>

    expect(stats.totalDiscussionsStarted).toBe(5)
    expect(stats.totalDiscussionsAnswered).toBe(3)
  })
})
