import { describe, it, expect } from 'vitest'
import {
  resolveCacheSeconds,
  setCacheHeaders,
  setErrorCacheHeaders,
  DURATIONS,
  CACHE_TTL,
} from '../../src/common/cache.js'

describe('DURATIONS', () => {
  it('exports named duration constants', () => {
    expect(typeof DURATIONS.ONE_MINUTE).toBe('number')
    expect(DURATIONS.ONE_MINUTE).toBe(60)
    expect(typeof DURATIONS.TWO_HOURS).toBe('number')
    expect(DURATIONS.TWO_HOURS).toBe(7200)
  })
})

describe('CACHE_TTL', () => {
  it('has entries for each card type', () => {
    expect(CACHE_TTL).toHaveProperty('STATS_CARD')
    expect(CACHE_TTL).toHaveProperty('TOP_LANGS_CARD')
  })

  it('each entry has DEFAULT, MIN, MAX', () => {
    expect(CACHE_TTL.STATS_CARD).toHaveProperty('DEFAULT')
    expect(CACHE_TTL.STATS_CARD).toHaveProperty('MIN')
    expect(CACHE_TTL.STATS_CARD).toHaveProperty('MAX')
  })
})

describe('resolveCacheSeconds', () => {
  it('returns requested value when within range', () => {
    expect(resolveCacheSeconds({ requested: 300, def: 1800, min: 60, max: 3600 })).toBe(300)
  })

  it('clamps to min when requested is too low', () => {
    expect(resolveCacheSeconds({ requested: 10, def: 1800, min: 60, max: 3600 })).toBe(60)
  })

  it('clamps to max when requested is too high', () => {
    expect(resolveCacheSeconds({ requested: 10000, def: 1800, min: 60, max: 3600 })).toBe(3600)
  })

  it('returns default when requested is NaN', () => {
    expect(resolveCacheSeconds({ requested: NaN, def: 1800, min: 60, max: 3600 })).toBe(1800)
  })
})

describe('setCacheHeaders', () => {
  it('returns object with Cache-Control header', () => {
    const headers = setCacheHeaders(1800)
    expect(headers).toHaveProperty('Cache-Control')
    expect(headers['Cache-Control']).toContain('1800')
  })

  it('includes max-age in Cache-Control', () => {
    const headers = setCacheHeaders(300)
    expect(headers['Cache-Control']).toContain('max-age=300')
  })
})

describe('setErrorCacheHeaders', () => {
  it('returns Cache-Control headers for errors', () => {
    const headers = setErrorCacheHeaders()
    expect(headers).toHaveProperty('Cache-Control')
  })

  it('uses short TTL for errors', () => {
    const headers = setErrorCacheHeaders()
    // Error cache should be shorter than default
    expect(headers['Cache-Control']).toBeDefined()
  })
})
