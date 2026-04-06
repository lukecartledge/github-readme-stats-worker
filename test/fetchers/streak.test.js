import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchStreak } from '../../src/fetchers/streak.js'

vi.mock('../../src/common/http.js', () => ({
  request: vi.fn(),
}))

vi.mock('../../src/common/retryer.js', () => ({
  retryer: vi.fn(),
  RETRIES: 0,
}))

const { request } = await import('../../src/common/http.js')
const { retryer } = await import('../../src/common/retryer.js')

const makeMetadataResponse = (years, createdAt = '2021-01-01T00:00:00Z') => ({
  data: {
    data: {
      user: {
        createdAt,
        contributionsCollection: {
          contributionYears: years,
        },
      },
    },
  },
})

const makeYearResponse = (days) => ({
  data: {
    data: {
      user: {
        contributionsCollection: {
          contributionCalendar: {
            weeks: [
              {
                contributionDays: days.map(([date, contributionCount]) => ({
                  date,
                  contributionCount,
                })),
              },
            ],
          },
        },
      },
    },
  },
})

describe('fetchStreak', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws for missing username', async () => {
    await expect(fetchStreak('')).rejects.toThrow()
  })

  it('calculates no-contribution response correctly', async () => {
    retryer.mockResolvedValueOnce(makeMetadataResponse([2024]))
    retryer.mockResolvedValueOnce(
      makeYearResponse([
        ['2024-01-01', 0],
        ['2024-01-02', 0],
        ['2024-01-03', 0],
      ]),
    )

    const result = await fetchStreak('testuser', { GH_PAT_1: 'token' })

    expect(result.totalContributions).toBe(0)
    expect(result.firstContribution).toBe('')
    expect(result.currentStreak.length).toBe(0)
    expect(result.longestStreak.length).toBe(0)
  })

  it('calculates single-day streak correctly', async () => {
    retryer.mockResolvedValueOnce(makeMetadataResponse([2024]))
    retryer.mockResolvedValueOnce(makeYearResponse([['2024-05-10', 4]]))

    const result = await fetchStreak('testuser', { GH_PAT_1: 'token' })

    expect(result.totalContributions).toBe(4)
    expect(result.firstContribution).toBe('2024-05-10')
    expect(result.currentStreak).toEqual({
      start: '2024-05-10',
      end: '2024-05-10',
      length: 1,
    })
    expect(result.longestStreak).toEqual({
      start: '2024-05-10',
      end: '2024-05-10',
      length: 1,
    })
  })

  it('resets current streak on contribution gap and tracks longest streak', async () => {
    retryer.mockResolvedValueOnce(makeMetadataResponse([2024]))
    retryer.mockResolvedValueOnce(
      makeYearResponse([
        ['2024-01-01', 1],
        ['2024-01-02', 2],
        ['2024-01-03', 0],
        ['2024-01-04', 3],
        ['2024-01-05', 1],
      ]),
    )

    const result = await fetchStreak('testuser', { GH_PAT_1: 'token' })

    expect(result.totalContributions).toBe(7)
    expect(result.firstContribution).toBe('2024-01-01')
    expect(result.longestStreak).toEqual({
      start: '2024-01-01',
      end: '2024-01-02',
      length: 2,
    })
    expect(result.currentStreak).toEqual({
      start: '2024-01-04',
      end: '2024-01-05',
      length: 2,
    })
  })

  it('applies grace period when today has zero contributions', async () => {
    retryer.mockResolvedValueOnce(makeMetadataResponse([2024]))
    retryer.mockResolvedValueOnce(
      makeYearResponse([
        ['2024-01-01', 1],
        ['2024-01-02', 1],
        ['2024-01-03', 0],
      ]),
    )

    const result = await fetchStreak('testuser', { GH_PAT_1: 'token' })

    expect(result.currentStreak).toEqual({
      start: '2024-01-01',
      end: '2024-01-02',
      length: 2,
    })
    expect(result.longestStreak.length).toBe(2)
  })

  it('fetches contribution years in parallel and passes env to retryer', async () => {
    retryer.mockResolvedValueOnce(makeMetadataResponse([2023, 2024]))
    retryer.mockResolvedValueOnce(makeYearResponse([['2023-12-31', 2]]))
    retryer.mockResolvedValueOnce(makeYearResponse([['2024-01-01', 4]]))

    const env = { GH_PAT_1: 'token', FOO: 'bar' }
    const result = await fetchStreak('testuser', env)

    expect(result.totalContributions).toBe(6)
    expect(retryer).toHaveBeenCalledTimes(3)
    expect(retryer).toHaveBeenNthCalledWith(1, expect.any(Function), { login: 'testuser' }, env)
    expect(retryer).toHaveBeenNthCalledWith(
      2,
      expect.any(Function),
      {
        login: 'testuser',
        from: '2023-01-01T00:00:00Z',
        to: '2023-12-31T23:59:59Z',
      },
      env,
    )
    expect(retryer).toHaveBeenNthCalledWith(
      3,
      expect.any(Function),
      {
        login: 'testuser',
        from: '2024-01-01T00:00:00Z',
        to: '2024-12-31T23:59:59Z',
      },
      env,
    )
  })

  it('throws on GraphQL error response', async () => {
    retryer.mockResolvedValueOnce({
      data: {
        errors: [{ message: 'Could not resolve to a User' }],
      },
    })

    await expect(fetchStreak('unknown', { GH_PAT_1: 'token' })).rejects.toThrow(
      'Could not resolve to a User',
    )
  })

  it('keeps request import mockable for fetcher callback usage', () => {
    expect(request).toBeDefined()
  })

  it('caps current year to today to avoid future zero-contribution days', async () => {
    const currentYear = new Date().getUTCFullYear()
    const todayStr = new Date().toISOString().split('T')[0]

    retryer.mockResolvedValueOnce(makeMetadataResponse([currentYear]))
    retryer.mockResolvedValueOnce(makeYearResponse([[todayStr, 5]]))

    await fetchStreak('testuser', { GH_PAT_1: 'token' })

    expect(retryer).toHaveBeenNthCalledWith(
      2,
      expect.any(Function),
      {
        login: 'testuser',
        from: `${currentYear}-01-01T00:00:00Z`,
        to: `${todayStr}T23:59:59Z`,
      },
      { GH_PAT_1: 'token' },
    )
  })
})
