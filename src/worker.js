import { renderStatsCard } from './cards/stats.js'
import { renderTopLanguages } from './cards/top-languages.js'
import { guardAccess } from './common/access.js'
import {
  CACHE_TTL,
  resolveCacheSeconds,
  setCacheHeaders,
  setErrorCacheHeaders,
} from './common/cache.js'
import { MissingParamError, retrieveSecondaryMessage } from './common/error.js'
import { parseArray, parseBoolean } from './common/ops.js'
import { renderError } from './common/render.js'
import { fetchStats } from './fetchers/stats.js'
import { fetchTopLanguages } from './fetchers/top-languages.js'
import { isLocaleAvailable } from './translations.js'

const SVG_CONTENT_TYPE = 'image/svg+xml'

const getResponse = (svg, cacheHeaders, status = 200) => {
  const headers = new Headers({
    'Content-Type': SVG_CONTENT_TYPE,
    ...cacheHeaders,
  })
  return new Response(svg, { status, headers })
}

const getBaseColorOptions = (params) => ({
  title_color: params.title_color,
  text_color: params.text_color,
  bg_color: params.bg_color,
  border_color: params.border_color,
  theme: params.theme,
})

const handleStatsRoute = async (url, env) => {
  const params = Object.fromEntries(url.searchParams.entries())
  const colors = getBaseColorOptions(params)

  const access = guardAccess({
    res: { send: (value) => value },
    id: params.username,
    type: 'username',
    env,
    colors,
  })

  if (!access.isPassed) {
    return getResponse(access.result, setErrorCacheHeaders(), 200)
  }

  if (params.locale && !isLocaleAvailable(params.locale)) {
    return getResponse(
      renderError({
        message: 'Something went wrong',
        secondaryMessage: 'Language not found',
        renderOptions: colors,
      }),
      setErrorCacheHeaders(),
      200,
    )
  }

  try {
    const showStats = parseArray(params.show)
    const stats = await fetchStats(
      params.username,
      parseBoolean(params.include_all_commits),
      parseArray(params.exclude_repo),
      showStats.includes('prs_merged') || showStats.includes('prs_merged_percentage'),
      showStats.includes('discussions_started'),
      showStats.includes('discussions_answered'),
      parseInt(params.commits_year, 10),
      env,
    )

    const cacheSeconds = resolveCacheSeconds({
      requested: parseInt(params.cache_seconds, 10),
      def: CACHE_TTL.STATS_CARD.DEFAULT,
      min: CACHE_TTL.STATS_CARD.MIN,
      max: CACHE_TTL.STATS_CARD.MAX,
    })

    const svg = renderStatsCard(stats, {
      hide: parseArray(params.hide),
      show_icons: parseBoolean(params.show_icons),
      hide_title: parseBoolean(params.hide_title),
      hide_border: parseBoolean(params.hide_border),
      card_width: parseInt(params.card_width, 10),
      hide_rank: parseBoolean(params.hide_rank),
      include_all_commits: parseBoolean(params.include_all_commits),
      commits_year: parseInt(params.commits_year, 10),
      line_height: params.line_height,
      title_color: params.title_color,
      ring_color: params.ring_color,
      icon_color: params.icon_color,
      text_color: params.text_color,
      text_bold: parseBoolean(params.text_bold),
      bg_color: params.bg_color,
      theme: params.theme,
      custom_title: params.custom_title,
      border_radius: params.border_radius,
      border_color: params.border_color,
      number_format: params.number_format,
      number_precision: parseInt(params.number_precision, 10),
      locale: params.locale ? params.locale.toLowerCase() : null,
      disable_animations: parseBoolean(params.disable_animations),
      rank_icon: params.rank_icon,
      show: showStats,
    })

    return getResponse(svg, setCacheHeaders(cacheSeconds), 200)
  } catch (err) {
    const isError = err instanceof Error
    const message = isError ? err.message : 'An unknown error occurred'
    const secondaryMessage = isError ? retrieveSecondaryMessage(err) : undefined

    return getResponse(
      renderError({
        message,
        secondaryMessage,
        renderOptions: {
          ...colors,
          show_repo_link: !(err instanceof MissingParamError),
        },
      }),
      setErrorCacheHeaders(),
      200,
    )
  }
}

const handleTopLanguagesRoute = async (url, env) => {
  const params = Object.fromEntries(url.searchParams.entries())
  const colors = getBaseColorOptions(params)

  const access = guardAccess({
    res: { send: (value) => value },
    id: params.username,
    type: 'username',
    env,
    colors,
  })

  if (!access.isPassed) {
    return getResponse(access.result, setErrorCacheHeaders(), 200)
  }

  if (params.locale && !isLocaleAvailable(params.locale)) {
    return getResponse(
      renderError({
        message: 'Something went wrong',
        secondaryMessage: 'Locale not found',
        renderOptions: colors,
      }),
      setErrorCacheHeaders(),
      200,
    )
  }

  if (
    params.layout !== undefined &&
    (typeof params.layout !== 'string' ||
      !['compact', 'normal', 'donut', 'donut-vertical', 'pie'].includes(params.layout))
  ) {
    return getResponse(
      renderError({
        message: 'Something went wrong',
        secondaryMessage: 'Incorrect layout input',
        renderOptions: colors,
      }),
      setErrorCacheHeaders(),
      200,
    )
  }

  if (
    params.stats_format !== undefined &&
    (typeof params.stats_format !== 'string' ||
      !['bytes', 'percentages'].includes(params.stats_format))
  ) {
    return getResponse(
      renderError({
        message: 'Something went wrong',
        secondaryMessage: 'Incorrect stats_format input',
        renderOptions: colors,
      }),
      setErrorCacheHeaders(),
      200,
    )
  }

  try {
    const topLangs = await fetchTopLanguages(
      params.username,
      parseArray(params.exclude_repo),
      params.size_weight,
      params.count_weight,
      env,
    )

    const cacheSeconds = resolveCacheSeconds({
      requested: parseInt(params.cache_seconds, 10),
      def: CACHE_TTL.TOP_LANGS_CARD.DEFAULT,
      min: CACHE_TTL.TOP_LANGS_CARD.MIN,
      max: CACHE_TTL.TOP_LANGS_CARD.MAX,
    })

    const svg = renderTopLanguages(topLangs, {
      custom_title: params.custom_title,
      hide_title: parseBoolean(params.hide_title),
      hide_border: parseBoolean(params.hide_border),
      card_width: parseInt(params.card_width, 10),
      hide: parseArray(params.hide),
      title_color: params.title_color,
      text_color: params.text_color,
      bg_color: params.bg_color,
      theme: params.theme,
      layout: params.layout,
      langs_count: parseInt(params.langs_count, 10),
      border_radius: params.border_radius,
      border_color: params.border_color,
      locale: params.locale ? params.locale.toLowerCase() : null,
      disable_animations: parseBoolean(params.disable_animations),
      hide_progress: parseBoolean(params.hide_progress),
      stats_format: params.stats_format,
    })

    return getResponse(svg, setCacheHeaders(cacheSeconds), 200)
  } catch (err) {
    const isError = err instanceof Error
    const message = isError ? err.message : 'An unknown error occurred'
    const secondaryMessage = isError ? retrieveSecondaryMessage(err) : undefined

    return getResponse(
      renderError({
        message,
        secondaryMessage,
        renderOptions: {
          ...colors,
          show_repo_link: !(err instanceof MissingParamError),
        },
      }),
      setErrorCacheHeaders(),
      200,
    )
  }
}

/**
 * Builds a normalized cache key URL.
 * Strips trailing slashes and sorts query params for consistent cache hits.
 *
 * @param {URL} url
 * @returns {Request}
 */
const buildCacheKey = (url) => {
  const normalized = new URL(url.toString())
  normalized.pathname = normalized.pathname.replace(/\/+$/, '') || '/'
  normalized.searchParams.sort()
  return new Request(normalized.toString())
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    const pathname = url.pathname.replace(/\/+$/, '') || '/'

    if (pathname !== '/api' && pathname !== '/api/top-langs') {
      return new Response('Not Found', {
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }

    const cache = caches.default
    const cacheKey = buildCacheKey(url)

    const cached = await cache.match(cacheKey)
    if (cached) {
      const response = new Response(cached.body, cached)
      response.headers.set('X-Cache', 'HIT')
      return response
    }

    let response
    if (pathname === '/api') {
      response = await handleStatsRoute(url, env)
    } else {
      response = await handleTopLanguagesRoute(url, env)
    }

    if (response.status === 200) {
      const cloned = response.clone()
      response.headers.set('X-Cache', 'MISS')
      ctx.waitUntil(cache.put(cacheKey, cloned))
    }

    return response
  },
}
