// @ts-check

/**
 * @param {Record<string, unknown>=} env
 * @param {string} key
 * @returns {string[]|undefined}
 */
const parseEnvList = (env = {}, key) => {
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

/**
 * @param {Record<string, unknown>=} env
 * @returns {string[]|undefined}
 */
const getWhitelist = (env = {}) => parseEnvList(env, 'WHITELIST')

/**
 * @param {Record<string, unknown>=} env
 * @returns {string[]|undefined}
 */
const getGistWhitelist = (env = {}) => parseEnvList(env, 'GIST_WHITELIST')

/**
 * @param {Record<string, unknown>=} env
 * @returns {string[]}
 */
const getExcludeRepositories = (env = {}) => parseEnvList(env, 'EXCLUDE_REPO') || []

/**
 * @param {Record<string, unknown>=} env
 * @returns {boolean}
 */
const isFetchMultiPageStars = (env = {}) => env.FETCH_MULTI_PAGE_STARS === 'true'

export { getWhitelist, getGistWhitelist, getExcludeRepositories, isFetchMultiPageStars }
