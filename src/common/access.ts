import { renderError } from './render.js'
import { blacklist } from './blacklist.js'
import { getWhitelist, getGistWhitelist } from './envs.js'

const NOT_WHITELISTED_USERNAME_MESSAGE = 'This username is not whitelisted'
const NOT_WHITELISTED_GIST_MESSAGE = 'This gist ID is not whitelisted'
const BLACKLISTED_MESSAGE = 'This username is blacklisted'

interface GuardAccessArgs {
  res: { send: (body: string) => unknown }
  id: string
  type: 'username' | 'gist' | 'wakatime'
  env?: Record<string, unknown>
  colors: {
    title_color?: string
    text_color?: string
    bg_color?: string
    border_color?: string
    theme?: string
  }
}

interface GuardAccessResult {
  isPassed: boolean
  result?: unknown
}

/** Guards access using whitelist/blacklist. */
const guardAccess = ({ res, id, type, env = {}, colors }: GuardAccessArgs): GuardAccessResult => {
  if (!['username', 'gist', 'wakatime'].includes(type)) {
    throw new Error('Invalid type. Expected "username", "gist", or "wakatime".')
  }

  const currentWhitelist = type === 'gist' ? getGistWhitelist(env) : getWhitelist(env)
  const notWhitelistedMsg =
    type === 'gist' ? NOT_WHITELISTED_GIST_MESSAGE : NOT_WHITELISTED_USERNAME_MESSAGE

  if (Array.isArray(currentWhitelist) && !currentWhitelist.includes(id)) {
    const result = res.send(
      renderError({
        message: notWhitelistedMsg,
        secondaryMessage: 'Please deploy your own instance',
        renderOptions: {
          ...colors,
          show_repo_link: false,
        },
      }),
    )
    return { isPassed: false, result }
  }

  if (type === 'username' && currentWhitelist === undefined && blacklist.includes(id)) {
    const result = res.send(
      renderError({
        message: BLACKLISTED_MESSAGE,
        secondaryMessage: 'Please deploy your own instance',
        renderOptions: {
          ...colors,
          show_repo_link: false,
        },
      }),
    )
    return { isPassed: false, result }
  }

  return { isPassed: true }
}

export { guardAccess }
