import { clampValue } from './ops.js'

const MIN = 60
const HOUR = 60 * MIN
const DAY = 24 * HOUR

const DURATIONS = {
  ONE_MINUTE: MIN,
  FIVE_MINUTES: 5 * MIN,
  TEN_MINUTES: 10 * MIN,
  FIFTEEN_MINUTES: 15 * MIN,
  THIRTY_MINUTES: 30 * MIN,

  TWO_HOURS: 2 * HOUR,
  FOUR_HOURS: 4 * HOUR,
  SIX_HOURS: 6 * HOUR,
  EIGHT_HOURS: 8 * HOUR,
  TWELVE_HOURS: 12 * HOUR,

  ONE_DAY: DAY,
  TWO_DAY: 2 * DAY,
  SIX_DAY: 6 * DAY,
  TEN_DAY: 10 * DAY,
} as const

interface CardCacheLimits {
  DEFAULT: number
  MIN: number
  MAX: number
}

const CACHE_TTL: Record<string, CardCacheLimits | number> = {
  STATS_CARD: {
    DEFAULT: DURATIONS.ONE_DAY,
    MIN: DURATIONS.TWELVE_HOURS,
    MAX: DURATIONS.TWO_DAY,
  },
  TOP_LANGS_CARD: {
    DEFAULT: DURATIONS.SIX_DAY,
    MIN: DURATIONS.TWO_DAY,
    MAX: DURATIONS.TEN_DAY,
  },
  PIN_CARD: {
    DEFAULT: DURATIONS.TEN_DAY,
    MIN: DURATIONS.ONE_DAY,
    MAX: DURATIONS.TEN_DAY,
  },
  GIST_CARD: {
    DEFAULT: DURATIONS.TWO_DAY,
    MIN: DURATIONS.ONE_DAY,
    MAX: DURATIONS.TEN_DAY,
  },
  STREAK_CARD: {
    DEFAULT: DURATIONS.ONE_DAY,
    MIN: DURATIONS.TWELVE_HOURS,
    MAX: DURATIONS.TWO_DAY,
  },
  WAKATIME_CARD: {
    DEFAULT: DURATIONS.ONE_DAY,
    MIN: DURATIONS.TWELVE_HOURS,
    MAX: DURATIONS.TWO_DAY,
  },
  ERROR: DURATIONS.TWO_HOURS,
}

interface ResolveCacheSecondsArgs {
  requested: number
  def: number
  min: number
  max: number
}

const resolveCacheSeconds = ({ requested, def, min, max }: ResolveCacheSecondsArgs): number => {
  return clampValue(isNaN(requested) ? def : requested, min, max)
}

const disableCaching = (): Record<string, string> => {
  return {
    'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0, s-maxage=0',
    Pragma: 'no-cache',
    Expires: '0',
  }
}

const setCacheHeaders = (cacheSeconds: number): Record<string, string> => {
  if (cacheSeconds < 1) {
    return disableCaching()
  }

  return {
    'Cache-Control':
      `max-age=${cacheSeconds}, ` +
      `s-maxage=${cacheSeconds}, ` +
      `stale-while-revalidate=${DURATIONS.ONE_DAY}`,
  }
}

const setErrorCacheHeaders = (): Record<string, string> => {
  return {
    'Cache-Control':
      `max-age=${CACHE_TTL.ERROR}, ` +
      `s-maxage=${CACHE_TTL.ERROR}, ` +
      `stale-while-revalidate=${DURATIONS.ONE_DAY}`,
    'X-Card-Error': '1',
  }
}

export { resolveCacheSeconds, setCacheHeaders, setErrorCacheHeaders, DURATIONS, CACHE_TTL }
