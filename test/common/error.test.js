import { describe, it, expect } from 'vitest'
import {
  CustomError,
  MissingParamError,
  SECONDARY_ERROR_MESSAGES,
  TRY_AGAIN_LATER,
  retrieveSecondaryMessage,
} from '../../src/common/error.js'

describe('CustomError', () => {
  it('creates error with message and type', () => {
    const err = new CustomError('test message', 'TEST_TYPE')
    expect(err.message).toBe('test message')
    expect(err.type).toBe('TEST_TYPE')
    expect(err.secondaryMessage).toBe('TEST_TYPE')
    expect(err).toBeInstanceOf(Error)
  })

  it('has static type constants', () => {
    expect(CustomError.MAX_RETRY).toBe('MAX_RETRY')
    expect(CustomError.NO_TOKENS).toBe('NO_TOKENS')
    expect(CustomError.USER_NOT_FOUND).toBe('USER_NOT_FOUND')
    expect(CustomError.GRAPHQL_ERROR).toBe('GRAPHQL_ERROR')
    expect(CustomError.GITHUB_REST_API_ERROR).toBe('GITHUB_REST_API_ERROR')
    expect(CustomError.WAKATIME_ERROR).toBe('WAKATIME_ERROR')
  })
})

describe('MissingParamError', () => {
  it('creates error listing missing params', () => {
    const err = new MissingParamError(['username', 'repo'])
    expect(err.message).toContain('username')
    expect(err.message).toContain('repo')
    expect(err).toBeInstanceOf(Error)
  })

  it('includes secondary message when provided', () => {
    const err = new MissingParamError(['username'], 'custom secondary')
    expect(err.secondaryMessage).toBe('custom secondary')
  })

  it('works with single param', () => {
    const err = new MissingParamError(['username'])
    expect(err.message).toContain('username')
  })
})

describe('SECONDARY_ERROR_MESSAGES', () => {
  it('is an object with string values', () => {
    expect(typeof SECONDARY_ERROR_MESSAGES).toBe('object')
    Object.values(SECONDARY_ERROR_MESSAGES).forEach((msg) => {
      expect(typeof msg).toBe('string')
    })
  })

  it('has entries for each error type', () => {
    expect(SECONDARY_ERROR_MESSAGES).toHaveProperty('MAX_RETRY')
    expect(SECONDARY_ERROR_MESSAGES).toHaveProperty('NO_TOKENS')
    expect(SECONDARY_ERROR_MESSAGES).toHaveProperty('USER_NOT_FOUND')
  })
})

describe('TRY_AGAIN_LATER', () => {
  it('is a string', () => {
    expect(typeof TRY_AGAIN_LATER).toBe('string')
  })
})

describe('retrieveSecondaryMessage', () => {
  it('returns secondaryMessage from CustomError', () => {
    const err = new CustomError('msg', 'MAX_RETRY')
    expect(retrieveSecondaryMessage(err)).toBe(SECONDARY_ERROR_MESSAGES.MAX_RETRY)
  })

  it('returns undefined for standard Error', () => {
    const err = new Error('normal error')
    expect(retrieveSecondaryMessage(err)).toBeUndefined()
  })

  it('returns undefined for non-Error objects', () => {
    expect(retrieveSecondaryMessage({})).toBeUndefined()
  })
})
