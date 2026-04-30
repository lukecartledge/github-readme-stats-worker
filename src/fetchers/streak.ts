import { MissingParamError } from '../common/error.js'
import { request } from '../common/http.js'
import { retryer } from '../common/retryer.js'
import type { GraphQLResponse } from './types.js'

type GraphQLError = { type?: string; message?: string }
type ResponseBody = { data?: unknown; errors?: GraphQLError[] } | null

const GRAPHQL_STREAK_YEARS_QUERY = `
  query streakYears($login: String!) {
    user(login: $login) {
      createdAt
      contributionsCollection {
        contributionYears
      }
    }
  }
`

const GRAPHQL_STREAK_YEAR_QUERY = `
  query streakByYear($login: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $login) {
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          weeks {
            contributionDays {
              contributionCount
              date
            }
          }
        }
      }
    }
  }
`

const fetcher = (variables: unknown, token: string): Promise<GraphQLResponse> => {
  const vars = variables as Record<string, unknown>
  const query = vars.from ? GRAPHQL_STREAK_YEAR_QUERY : GRAPHQL_STREAK_YEARS_QUERY

  return request(
    {
      query,
      variables: vars,
    },
    {
      Authorization: `bearer ${token}`,
    },
  )
}

const getErrorMessage = (response: GraphQLResponse | null | undefined): string => {
  const body = response?.data as ResponseBody
  const message = body?.errors?.[0]?.message
  return message || 'Failed to fetch contribution streak data from GitHub GraphQL API.'
}

const readUserFromResponse = (response: GraphQLResponse | null | undefined): Record<string, unknown> => {
  const body = response?.data as ResponseBody

  if (!response || body === null) {
    throw new Error(`GitHub API returned HTTP ${response?.status}: ${response?.statusText}`)
  }

  if (body?.errors) {
    throw new Error(getErrorMessage(response))
  }

  const user = (body?.data as { user?: Record<string, unknown> } | undefined)?.user
  if (!user) {
    throw new Error('Could not fetch user contribution data.')
  }

  return user
}

const getYearWindow = (year: number): { from: string; to: string } => {
  const now = new Date()
  const currentYear = now.getUTCFullYear()

  return {
    from: `${year}-01-01T00:00:00Z`,
    to:
      year === currentYear
        ? now.toISOString().split('T')[0] + 'T23:59:59Z'
        : `${year}-12-31T23:59:59Z`,
  }
}

interface StreakStats {
  totalContributions: number
  firstContribution: string
  longestStreak: { start: string; end: string; length: number }
  currentStreak: { start: string; end: string; length: number }
}

const getContributionStats = (contributionsByDate: Record<string, number>): StreakStats => {
  const dates = Object.keys(contributionsByDate).sort()
  const firstDate = dates[0] || ''
  const today = dates[dates.length - 1] || ''

  const stats: StreakStats = {
    totalContributions: 0,
    firstContribution: '',
    longestStreak: {
      start: firstDate,
      end: firstDate,
      length: 0,
    },
    currentStreak: {
      start: firstDate,
      end: firstDate,
      length: 0,
    },
  }

  for (const date of dates) {
    const contributionCount = contributionsByDate[date]
    stats.totalContributions += contributionCount

    if (contributionCount > 0) {
      if (stats.currentStreak.length === 0) {
        stats.currentStreak.start = date
      }

      stats.currentStreak.length += 1
      stats.currentStreak.end = date

      if (!stats.firstContribution) {
        stats.firstContribution = date
      }

      if (stats.currentStreak.length > stats.longestStreak.length) {
        stats.longestStreak = {
          ...stats.currentStreak,
        }
      }
    } else if (date !== today) {
      stats.currentStreak = {
        start: today,
        end: today,
        length: 0,
      }
    }
  }

  return stats
}

const fetchStreak = async (username: string, env: Record<string, unknown> = {}): Promise<StreakStats> => {
  if (!username) {
    throw new MissingParamError(['username'])
  }

  const metadataResponse = await retryer(fetcher, { login: username }, env) as GraphQLResponse
  const metadataUser = readUserFromResponse(metadataResponse)

  const metadataUserTyped = metadataUser as {
    createdAt: string
    contributionsCollection?: { contributionYears?: number[] }
  }

  const contributionYears = metadataUserTyped.contributionsCollection?.contributionYears || []
  const yearsToFetch = contributionYears.length
    ? contributionYears
    : [new Date(metadataUserTyped.createdAt).getUTCFullYear()]

  const yearlyResponses = await Promise.all(
    yearsToFetch.map((year) => {
      const { from, to } = getYearWindow(year)

      return retryer(
        fetcher,
        {
          login: username,
          from,
          to,
        },
        env,
      ) as Promise<GraphQLResponse>
    }),
  )

  const contributionsByDate: Record<string, number> = {}

  for (const response of yearlyResponses) {
    const user = readUserFromResponse(response)
    const userTyped = user as {
      contributionsCollection?: {
        contributionCalendar?: {
          weeks?: Array<{
            contributionDays?: Array<{ contributionCount: number; date: string }>
          }>
        }
      }
    }
    const weeks = userTyped.contributionsCollection?.contributionCalendar?.weeks || []

    for (const week of weeks) {
      for (const day of week.contributionDays || []) {
        const currentCount = contributionsByDate[day.date] || 0
        contributionsByDate[day.date] = currentCount + day.contributionCount
      }
    }
  }

  return getContributionStats(contributionsByDate)
}

export { fetchStreak }
export default fetchStreak
