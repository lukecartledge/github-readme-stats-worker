const parseEnvList = (env: Record<string, unknown> = {}, key: string): string[] | undefined => {
  const value = env[key]
  if (typeof value !== 'string' || value.length === 0) {
    return undefined
  }

  const list = value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
  return list.length ? list : undefined
}

const getWhitelist = (env: Record<string, unknown> = {}): string[] | undefined =>
  parseEnvList(env, 'WHITELIST')

const getGistWhitelist = (env: Record<string, unknown> = {}): string[] | undefined =>
  parseEnvList(env, 'GIST_WHITELIST')

const getExcludeRepositories = (env: Record<string, unknown> = {}): string[] =>
  parseEnvList(env, 'EXCLUDE_REPO') || []

const isFetchMultiPageStars = (env: Record<string, unknown> = {}): boolean =>
  env.FETCH_MULTI_PAGE_STARS === 'true'

export { getWhitelist, getGistWhitelist, getExcludeRepositories, isFetchMultiPageStars }
