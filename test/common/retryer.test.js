import { describe, it, expect, vi, beforeEach } from 'vitest'
import { retryer } from '../../src/common/retryer.js'

vi.mock('../../src/common/log.js', () => ({
  logger: { log: vi.fn(), error: vi.fn() },
  default: { log: vi.fn(), error: vi.fn() },
}))

describe('retryer', () => {
  const env = { GH_PAT_1: 'token1', GH_PAT_2: 'token2' }

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('calls fetcher with first token on initial attempt', async () => {
    const fetcher = vi.fn().mockResolvedValue({ data: { user: {} } })
    await retryer(fetcher, { login: 'test' }, env)
    expect(fetcher).toHaveBeenCalledWith({ login: 'test' }, 'token1', 0)
  })

  it('returns fetcher response on success', async () => {
    const response = { data: { user: { name: 'Test' } } }
    const fetcher = vi.fn().mockResolvedValue(response)
    const result = await retryer(fetcher, {}, env)
    expect(result).toEqual(response)
  })

  it('throws when no tokens are found', async () => {
    const fetcher = vi.fn()
    await expect(retryer(fetcher, {}, {})).rejects.toThrow('No GitHub API tokens found')
  })

  it('retries on bad credentials', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({ data: { message: 'Bad credentials' } })
      .mockResolvedValueOnce({ data: { user: {} } })

    const result = await retryer(fetcher, {}, env)
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(fetcher).toHaveBeenLastCalledWith({}, 'token2', 1)
    expect(result).toEqual({ data: { user: {} } })
  })

  it('retries on rate limited response', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({
        data: { errors: [{ type: 'RATE_LIMITED', message: 'rate limited' }] },
      })
      .mockResolvedValueOnce({ data: { user: {} } })

    const result = await retryer(fetcher, {}, env)
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(result).toEqual({ data: { user: {} } })
  })

  it('retries on account suspended', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({
        data: { message: 'Sorry. Your account was suspended.' },
      })
      .mockResolvedValueOnce({ data: { user: {} } })

    await retryer(fetcher, {}, env)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('throws MAX_RETRY when all tokens are exhausted', async () => {
    const fetcher = vi.fn().mockResolvedValue({ data: { message: 'Bad credentials' } })

    await expect(retryer(fetcher, {}, env)).rejects.toThrow(
      'Downtime due to GitHub API rate limiting',
    )
  })

  it('throws fetcher errors directly', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('Network error'))
    await expect(retryer(fetcher, {}, env)).rejects.toThrow('Network error')
  })

  it('sorts tokens by numeric suffix', async () => {
    const envUnordered = { GH_PAT_3: 'token3', GH_PAT_1: 'token1', GH_PAT_2: 'token2' }
    const fetcher = vi.fn().mockResolvedValue({ data: {} })
    await retryer(fetcher, {}, envUnordered)
    expect(fetcher).toHaveBeenCalledWith({}, 'token1', 0)
  })

  it('ignores non-GH_PAT env vars', async () => {
    const envMixed = { GH_PAT_1: 'token1', OTHER_VAR: 'value', API_KEY: 'key' }
    const fetcher = vi.fn().mockResolvedValueOnce({ data: { message: 'Bad credentials' } })

    await expect(retryer(fetcher, {}, envMixed)).rejects.toThrow(
      'Downtime due to GitHub API rate limiting',
    )
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})
