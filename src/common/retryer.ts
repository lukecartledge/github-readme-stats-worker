import { CustomError } from './error.js'
import { logger } from './log.js'

const tokenKeyPattern = /^GH_PAT_(\d+)$/

type FetcherFunction = (variables: unknown, token: string, retries?: number) => Promise<unknown>

const getTokens = (env: Record<string, unknown> = {}): string[] => {
  return Object.entries(env)
    .filter(([key, value]) => tokenKeyPattern.test(key) && Boolean(value))
    .sort((a, b) => {
      const aMatch = a[0].match(tokenKeyPattern)
      const bMatch = b[0].match(tokenKeyPattern)
      return Number(aMatch?.[1] || 0) - Number(bMatch?.[1] || 0)
    })
    .map(([, value]) => String(value))
}

/**
 * Try to execute the fetcher function until it succeeds or the max number of retries is reached.
 */
const retryer = async (
  fetcher: FetcherFunction,
  variables: unknown,
  env: Record<string, unknown> = {},
  retries = 0,
): Promise<unknown> => {
  const tokens = getTokens(env)
  const retriesLimit = env.NODE_ENV === 'test' ? 7 : tokens.length

  if (!tokens.length) {
    throw new CustomError('No GitHub API tokens found', CustomError.NO_TOKENS)
  }

  if (retries >= retriesLimit) {
    throw new CustomError('Downtime due to GitHub API rate limiting', CustomError.MAX_RETRY)
  }

  try {
    const token = tokens[retries]
    const response = await fetcher(variables, token, retries) as Record<string, unknown> & {
      data?: {
        errors?: Array<{ type?: string; message?: string }>
        message?: string
      }
    }

    const errors = response?.data?.errors
    const errorType = errors?.[0]?.type
    const errorMsg = errors?.[0]?.message || ''
    const responseMessage = response?.data?.message
    const isRateLimited = (errors && errorType === 'RATE_LIMITED') || /rate limit/i.test(errorMsg)
    const isBadCredential = responseMessage === 'Bad credentials'
    const isAccountSuspended = responseMessage === 'Sorry. Your account was suspended.'

    if (isBadCredential || isAccountSuspended) {
      logger.log(`GH_PAT_${retries + 1} Failed`)
      return retryer(fetcher, variables, env, retries + 1)
    }

    if (isRateLimited) {
      logger.log(`GH_PAT_${retries + 1} Failed`)
      return retryer(fetcher, variables, env, retries + 1)
    }

    return response
  } catch (err) {
    throw err
  }
}

const RETRIES = 0

export { retryer, RETRIES }
export default retryer
