import { describe, it, expect } from 'vitest'
import { blacklist } from '../../src/common/blacklist.js'

describe('blacklist', () => {
  it('is an array', () => {
    expect(Array.isArray(blacklist)).toBe(true)
  })

  it('contains known blocked usernames', () => {
    expect(blacklist).toContain('renovate-bot')
    expect(blacklist).toContain('technote-space')
  })

  it('all entries are strings', () => {
    for (const entry of blacklist) {
      expect(typeof entry).toBe('string')
    }
  })
})
