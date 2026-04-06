import { describe, it, expect } from 'vitest'
import {
  getWhitelist,
  getGistWhitelist,
  getExcludeRepositories,
  isFetchMultiPageStars,
} from '../../src/common/envs.js'

describe('getWhitelist', () => {
  it('returns undefined when WHITELIST is not set', () => {
    expect(getWhitelist({})).toBeUndefined()
  })

  it('returns array of usernames when WHITELIST is set', () => {
    const env = { WHITELIST: 'user1,user2,user3' }
    expect(getWhitelist(env)).toEqual(['user1', 'user2', 'user3'])
  })

  it('handles single username', () => {
    const env = { WHITELIST: 'user1' }
    expect(getWhitelist(env)).toEqual(['user1'])
  })
})

describe('getGistWhitelist', () => {
  it('returns undefined when GIST_WHITELIST is not set', () => {
    expect(getGistWhitelist({})).toBeUndefined()
  })

  it('returns array of gist IDs when GIST_WHITELIST is set', () => {
    const env = { GIST_WHITELIST: 'abc123,def456' }
    expect(getGistWhitelist(env)).toEqual(['abc123', 'def456'])
  })
})

describe('getExcludeRepositories', () => {
  it('returns empty array when EXCLUDE_REPO is not set', () => {
    expect(getExcludeRepositories({})).toEqual([])
  })

  it('returns array of repo names when set', () => {
    const env = { EXCLUDE_REPO: 'repo1,repo2' }
    expect(getExcludeRepositories(env)).toEqual(['repo1', 'repo2'])
  })
})

describe('isFetchMultiPageStars', () => {
  it('returns false when FETCH_MULTI_PAGE_STARS is not set', () => {
    expect(isFetchMultiPageStars({})).toBe(false)
  })

  it("returns true when FETCH_MULTI_PAGE_STARS is 'true'", () => {
    const env = { FETCH_MULTI_PAGE_STARS: 'true' }
    expect(isFetchMultiPageStars(env)).toBe(true)
  })

  it('returns false for other values', () => {
    const env = { FETCH_MULTI_PAGE_STARS: 'false' }
    expect(isFetchMultiPageStars(env)).toBe(false)
  })
})
