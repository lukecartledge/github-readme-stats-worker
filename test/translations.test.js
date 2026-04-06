import { describe, it, expect } from 'vitest'
import {
  statCardLocales,
  langCardLocales,
  isLocaleAvailable,
  availableLocales,
} from '../src/translations.js'

describe('statCardLocales', () => {
  it('returns an object with locale keys', () => {
    const locales = statCardLocales({ name: 'Test', apostrophe: 's' })
    expect(locales).toHaveProperty('statcard.title')
    expect(typeof locales['statcard.title']).toBe('object')
  })

  it('includes English locale for title', () => {
    const locales = statCardLocales({ name: 'User', apostrophe: 's' })
    expect(locales['statcard.title'].en).toContain('User')
    expect(locales['statcard.title'].en).toContain('GitHub Stats')
  })

  it('encodes HTML in the name', () => {
    const locales = statCardLocales({ name: '<b>XSS</b>', apostrophe: '' })
    expect(locales['statcard.title'].en).not.toContain('<b>')
  })
})

describe('langCardLocales', () => {
  it('is an object with locale keys', () => {
    expect(langCardLocales).toHaveProperty('langcard.title')
    expect(typeof langCardLocales['langcard.title']).toBe('object')
  })

  it('includes English locale for title', () => {
    expect(langCardLocales['langcard.title'].en).toBe('Most Used Languages')
  })
})

describe('isLocaleAvailable', () => {
  it('returns true for "en"', () => {
    expect(isLocaleAvailable('en')).toBe(true)
  })

  it('returns false for unknown locale', () => {
    expect(isLocaleAvailable('zz-ZZ')).toBe(false)
  })

  it('returns true for known non-English locales', () => {
    expect(isLocaleAvailable('de')).toBe(true)
    expect(isLocaleAvailable('ja')).toBe(true)
    expect(isLocaleAvailable('fr')).toBe(true)
  })
})

describe('availableLocales', () => {
  it('is an array', () => {
    expect(Array.isArray(availableLocales)).toBe(true)
  })

  it('contains "en"', () => {
    expect(availableLocales).toContain('en')
  })

  it('has at least 10 locales', () => {
    expect(availableLocales.length).toBeGreaterThanOrEqual(10)
  })
})
