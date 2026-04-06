import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { request } from '../../src/common/http.js'

describe('request', () => {
  let originalFetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('sends POST to GitHub GraphQL endpoint', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
      json: () => Promise.resolve({ data: { user: {} } }),
    })

    await request({ query: '{ viewer { login } }' }, { Authorization: 'bearer token' })

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.github.com/graphql',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'User-Agent': 'github-readme-stats-worker',
          Authorization: 'bearer token',
        }),
      }),
    )
  })

  it('returns parsed JSON response with status info', async () => {
    const mockData = { data: { user: { name: 'Test' } } }
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'x-ratelimit-remaining': '4999' }),
      json: () => Promise.resolve(mockData),
    })

    const result = await request({}, {})
    expect(result.data).toEqual(mockData)
    expect(result.status).toBe(200)
    expect(result.statusText).toBe('OK')
  })

  it('returns null data when JSON parsing fails', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 502,
      statusText: 'Bad Gateway',
      headers: new Headers(),
      json: () => Promise.reject(new Error('Invalid JSON')),
    })

    const result = await request({}, {})
    expect(result.data).toBeNull()
    expect(result.status).toBe(502)
  })

  it('includes User-Agent header', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
      json: () => Promise.resolve({}),
    })

    await request({}, {})

    const callArgs = globalThis.fetch.mock.calls[0]
    expect(callArgs[1].headers['User-Agent']).toBe('github-readme-stats-worker')
  })

  it('stringifies body as JSON', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
      json: () => Promise.resolve({}),
    })

    const data = { query: '{ viewer { login } }', variables: { user: 'test' } }
    await request(data, {})

    const callArgs = globalThis.fetch.mock.calls[0]
    expect(callArgs[1].body).toBe(JSON.stringify(data))
  })
})
