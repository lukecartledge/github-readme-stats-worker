// @ts-check

import { MissingParamError } from '../common/error.js'
import { request } from '../common/http.js'
import { retryer } from '../common/retryer.js'

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

const fetcher = (variables, token) => {
  const query = variables.from ? GRAPHQL_STREAK_YEAR_QUERY : GRAPHQL_STREAK_YEARS_QUERY

  return request(
    {
      query,
      variables,
    },
    {
      Authorization: `bearer ${token}`,
    },
  )
}

const getErrorMessage = (response) => {
  const message = response?.data?.errors?.[0]?.message
  return message || 'Failed to fetch contribution streak data from GitHub GraphQL API.'
}

const readUserFromResponse = (response) => {
  if (!response || response.data === null) {
    throw new Error(`GitHub API returned HTTP ${response?.status}: ${response?.statusText}`)
  }

  if (response.data?.errors) {
    throw new Error(getErrorMessage(response))
  }

  const user = response.data?.data?.user
  if (!user) {
    throw new Error('Could not fetch user contribution data.')
  }

  return user
}

const getYearWindow = (year) => ({
  from: `${year}-01-01T00:00:00Z`,
  to: `${year}-12-31T23:59:59Z`,
})

const getContributionStats = (contributionsByDate) => {
  const dates = Object.keys(contributionsByDate).sort()
  const firstDate = dates[0] || ''
  const today = dates[dates.length - 1] || ''

  const stats = {
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

const fetchStreak = async (username, env = {}) => {
  if (!username) {
    throw new MissingParamError(['username'])
  }

  const metadataResponse = await retryer(fetcher, { login: username }, env)
  const metadataUser = readUserFromResponse(metadataResponse)

  const contributionYears = metadataUser.contributionsCollection?.contributionYears || []
  const yearsToFetch = contributionYears.length
    ? contributionYears
    : [new Date(metadataUser.createdAt).getUTCFullYear()]

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
      )
    }),
  )

  const contributionsByDate = {}

  for (const response of yearlyResponses) {
    const user = readUserFromResponse(response)
    const weeks = user.contributionsCollection?.contributionCalendar?.weeks || []

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
