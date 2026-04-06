import { describe, it, expect } from 'vitest'
import { I18n } from '../../src/common/I18n.js'

describe('I18n', () => {
  const translations = {
    greeting: {
      en: 'Hello',
      fr: 'Bonjour',
      de: 'Hallo',
    },
    farewell: {
      en: 'Goodbye',
      fr: 'Au revoir',
    },
  }

  it('returns correct translation for locale', () => {
    const i18n = new I18n({ locale: 'en', translations })
    expect(i18n.t('greeting')).toBe('Hello')
  })

  it('returns translation for non-default locale', () => {
    const i18n = new I18n({ locale: 'fr', translations })
    expect(i18n.t('greeting')).toBe('Bonjour')
  })

  it('defaults to en locale when none provided', () => {
    const i18n = new I18n({ translations })
    expect(i18n.t('greeting')).toBe('Hello')
  })

  it('throws for unknown translation key', () => {
    const i18n = new I18n({ locale: 'en', translations })
    expect(() => i18n.t('unknown_key')).toThrow('Translation string not found')
  })

  it('throws for missing locale in known key', () => {
    const i18n = new I18n({ locale: 'es', translations })
    expect(() => i18n.t('greeting')).toThrow('translation not found for locale')
  })
})
