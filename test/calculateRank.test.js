import { describe, it, expect } from 'vitest'
import { calculateRank } from '../src/calculateRank.js'

describe('calculateRank', () => {
  it('returns an object with level and percentile', () => {
    const result = calculateRank({
      all_commits: false,
      commits: 100,
      prs: 10,
      issues: 5,
      reviews: 2,
      repos: 50,
      stars: 100,
      followers: 10,
    })
    expect(result).toHaveProperty('level')
    expect(result).toHaveProperty('percentile')
    expect(typeof result.level).toBe('string')
    expect(typeof result.percentile).toBe('number')
  })

  it('returns S rank for very active users', () => {
    const result = calculateRank({
      all_commits: true,
      commits: 10000,
      prs: 500,
      issues: 200,
      reviews: 100,
      repos: 300,
      stars: 5000,
      followers: 1000,
    })
    expect(result.level).toBe('S')
    expect(result.percentile).toBeLessThan(1)
  })

  it('returns C rank for inactive users', () => {
    const result = calculateRank({
      all_commits: false,
      commits: 0,
      prs: 0,
      issues: 0,
      reviews: 0,
      repos: 0,
      stars: 0,
      followers: 0,
    })
    expect(result.level).toBe('C')
    expect(result.percentile).toBeCloseTo(100, 0)
  })

  it('uses different median for all_commits=true', () => {
    const withAllCommits = calculateRank({
      all_commits: true,
      commits: 500,
      prs: 20,
      issues: 10,
      reviews: 5,
      repos: 30,
      stars: 50,
      followers: 10,
    })
    const withoutAllCommits = calculateRank({
      all_commits: false,
      commits: 500,
      prs: 20,
      issues: 10,
      reviews: 5,
      repos: 30,
      stars: 50,
      followers: 10,
    })
    // all_commits=true uses higher median (1000 vs 250), so same commit count
    // results in worse rank (higher percentile)
    expect(withAllCommits.percentile).toBeGreaterThan(withoutAllCommits.percentile)
  })

  it('assigns middle ranks for moderate activity', () => {
    const result = calculateRank({
      all_commits: false,
      commits: 250,
      prs: 50,
      issues: 25,
      reviews: 2,
      repos: 50,
      stars: 50,
      followers: 10,
    })
    expect(['A+', 'A', 'A-', 'B+', 'B']).toContain(result.level)
    expect(result.percentile).toBeGreaterThan(0)
    expect(result.percentile).toBeLessThan(100)
  })

  it('ignores repos parameter in calculation', () => {
    const withRepos = calculateRank({
      all_commits: false,
      commits: 100,
      prs: 10,
      issues: 5,
      reviews: 2,
      repos: 1000,
      stars: 50,
      followers: 10,
    })
    const withoutRepos = calculateRank({
      all_commits: false,
      commits: 100,
      prs: 10,
      issues: 5,
      reviews: 2,
      repos: 0,
      stars: 50,
      followers: 10,
    })
    expect(withRepos.percentile).toBe(withoutRepos.percentile)
    expect(withRepos.level).toBe(withoutRepos.level)
  })

  it('percentile is always between 0 and 100', () => {
    const extremeHigh = calculateRank({
      all_commits: true,
      commits: 100000,
      prs: 10000,
      issues: 5000,
      reviews: 5000,
      repos: 1000,
      stars: 100000,
      followers: 100000,
    })
    const extremeLow = calculateRank({
      all_commits: false,
      commits: 0,
      prs: 0,
      issues: 0,
      reviews: 0,
      repos: 0,
      stars: 0,
      followers: 0,
    })
    expect(extremeHigh.percentile).toBeGreaterThanOrEqual(0)
    expect(extremeHigh.percentile).toBeLessThanOrEqual(100)
    expect(extremeLow.percentile).toBeGreaterThanOrEqual(0)
    expect(extremeLow.percentile).toBeLessThanOrEqual(100)
  })
})
