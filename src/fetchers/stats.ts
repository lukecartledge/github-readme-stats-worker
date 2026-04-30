import githubUsernameRegex from 'github-username-regex'
import { calculateRank } from '../calculateRank.js'
import { retryer } from '../common/retryer.js'
import { logger } from '../common/log.js'
import { getExcludeRepositories, isFetchMultiPageStars } from '../common/envs.js'
import { CustomError, MissingParamError } from '../common/error.js'
import { wrapTextMultiline } from '../common/fmt.js'
import { request } from '../common/http.js'
import type { StatsData, GraphQLResponse } from './types.js'

type GraphQLError = { type?: string; message?: string }
type ResponseBody = { data?: unknown; errors?: GraphQLError[] } | null

const GRAPHQL_REPOS_FIELD = `
  repositories(first: 100, ownerAffiliations: OWNER, orderBy: {direction: DESC, field: STARGAZERS}, after: $after) {
    totalCount
    nodes {
      name
      stargazers {
        totalCount
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
`

const GRAPHQL_REPOS_QUERY = `
  query userInfo($login: String!, $after: String) {
    user(login: $login) {
      ${GRAPHQL_REPOS_FIELD}
    }
  }
`

const GRAPHQL_STATS_QUERY = `
  query userInfo($login: String!, $after: String, $includeMergedPullRequests: Boolean!, $includeDiscussions: Boolean!, $includeDiscussionsAnswers: Boolean!, $startTime: DateTime = null) {
    user(login: $login) {
      name
      login
      commits: contributionsCollection (from: $startTime) {
        totalCommitContributions,
      }
      reviews: contributionsCollection {
        totalPullRequestReviewContributions
      }
      repositoriesContributedTo(first: 1, contributionTypes: [COMMIT, ISSUE, PULL_REQUEST, REPOSITORY]) {
        totalCount
      }
      pullRequests(first: 1) {
        totalCount
      }
      mergedPullRequests: pullRequests(states: MERGED) @include(if: $includeMergedPullRequests) {
        totalCount
      }
      openIssues: issues(states: OPEN) {
        totalCount
      }
      closedIssues: issues(states: CLOSED) {
        totalCount
      }
      followers {
        totalCount
      }
      repositoryDiscussions @include(if: $includeDiscussions) {
        totalCount
      }
      repositoryDiscussionComments(onlyAnswers: true) @include(if: $includeDiscussionsAnswers) {
        totalCount
      }
      ${GRAPHQL_REPOS_FIELD}
    }
  }
`

const fetcher = (variables: unknown, token: string): Promise<GraphQLResponse> => {
  const vars = variables as Record<string, unknown>
  const query = vars.after ? GRAPHQL_REPOS_QUERY : GRAPHQL_STATS_QUERY
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

interface StatsFetcherParams {
  username: string
  includeMergedPullRequests: boolean
  includeDiscussions: boolean
  includeDiscussionsAnswers: boolean
  startTime: string | undefined
  env: Record<string, unknown>
}

type RepoNode = { name: string; stargazers: { totalCount: number } }
type RepoPageInfo = { hasNextPage: boolean; endCursor: string }
type UserRepos = { repositories: { nodes: RepoNode[]; pageInfo: RepoPageInfo } }

const statsFetcher = async ({
  username,
  includeMergedPullRequests,
  includeDiscussions,
  includeDiscussionsAnswers,
  startTime,
  env = {},
}: StatsFetcherParams): Promise<GraphQLResponse | undefined> => {
  let stats: GraphQLResponse | undefined
  let hasNextPage = true
  let endCursor: string | null = null

  while (hasNextPage) {
    const variables = {
      login: username,
      first: 100,
      after: endCursor,
      includeMergedPullRequests,
      includeDiscussions,
      includeDiscussionsAnswers,
      startTime,
    }
    const res = await retryer(fetcher, variables, env) as GraphQLResponse
    const resBody = res.data as ResponseBody

    if (resBody === null) {
      throw new CustomError(
        `GitHub API returned HTTP ${res.status}: ${res.statusText}`,
        CustomError.GRAPHQL_ERROR,
      )
    }
    if (resBody?.errors) {
      return res
    }

    const userData = resBody?.data as { user: UserRepos } | undefined
    const repoNodes = userData?.user.repositories.nodes ?? []

    if (stats) {
      const statsBody = stats.data as ResponseBody
      const statsData = statsBody?.data as { user: UserRepos } | undefined
      statsData?.user.repositories.nodes.push(...repoNodes)
    } else {
      stats = res
    }

    const repoNodesWithStars = repoNodes.filter((node) => node.stargazers.totalCount !== 0)

    hasNextPage =
      isFetchMultiPageStars(env) &&
      repoNodes.length === repoNodesWithStars.length &&
      (userData?.user.repositories.pageInfo.hasNextPage ?? false)
    endCursor = userData?.user.repositories.pageInfo.endCursor ?? null
  }

  return stats
}

type CommitSearchResult = { data: unknown; status: number; statusText: string; headers: Headers }

const fetchTotalCommits = async (
  variables: unknown,
  token: string,
): Promise<CommitSearchResult> => {
  const vars = variables as Record<string, unknown>
  const response = await fetch(
    `https://api.github.com/search/commits?q=author:${vars.login}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'github-readme-stats-worker',
        Accept: 'application/vnd.github.cloak-preview',
        Authorization: `token ${token}`,
      },
    },
  )

  let data: unknown = null
  try {
    data = await response.json()
  } catch {
    data = null
  }

  return {
    data,
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  }
}

const toErrorWithMessage = (err: unknown): Error => {
  if (err instanceof Error) {
    return err
  }
  return new Error(String(err))
}

const totalCommitsFetcher = async (username: string, env: Record<string, unknown> = {}): Promise<number> => {
  if (!githubUsernameRegex.test(username)) {
    logger.log('Invalid username provided.')
    throw new Error('Invalid username provided.')
  }

  let res: CommitSearchResult
  try {
    res = await retryer(fetchTotalCommits, { login: username }, env) as CommitSearchResult
  } catch (err) {
    logger.log(err)
    throw toErrorWithMessage(err)
  }

  const totalCount = (res.data as { total_count?: number } | null)?.total_count
  if (!totalCount || isNaN(totalCount)) {
    throw new CustomError('Could not fetch total commits.', CustomError.GITHUB_REST_API_ERROR)
  }

  return totalCount
}

type StatsUser = {
  name: string | null
  login: string
  commits: { totalCommitContributions: number }
  reviews: { totalPullRequestReviewContributions: number }
  repositoriesContributedTo: { totalCount: number }
  pullRequests: { totalCount: number }
  mergedPullRequests?: { totalCount: number }
  openIssues: { totalCount: number }
  closedIssues: { totalCount: number }
  followers: { totalCount: number }
  repositoryDiscussions?: { totalCount: number }
  repositoryDiscussionComments?: { totalCount: number }
  repositories: {
    totalCount: number
    nodes: RepoNode[]
  }
}

const fetchStats = async (
  username: string,
  include_all_commits = false,
  exclude_repo: string[] = [],
  include_merged_pull_requests = false,
  include_discussions = false,
  include_discussions_answers = false,
  commits_year: number,
  env: Record<string, unknown> = {},
): Promise<StatsData> => {
  if (!username) {
    throw new MissingParamError(['username'])
  }

  const stats: StatsData = {
    name: '',
    totalPRs: 0,
    totalPRsMerged: 0,
    mergedPRsPercentage: 0,
    totalReviews: 0,
    totalCommits: 0,
    totalIssues: 0,
    totalStars: 0,
    totalDiscussionsStarted: 0,
    totalDiscussionsAnswered: 0,
    contributedTo: 0,
    rank: { level: 'C', percentile: 100 },
  }

  const res = await statsFetcher({
    username,
    includeMergedPullRequests: include_merged_pull_requests,
    includeDiscussions: include_discussions,
    includeDiscussionsAnswers: include_discussions_answers,
    startTime: commits_year ? `${commits_year}-01-01T00:00:00Z` : undefined,
    env,
  })

  const resBody = res?.data as ResponseBody

  if (!res || resBody === null) {
    throw new CustomError(
      `GitHub API returned HTTP ${res?.status}: ${res?.statusText}`,
      CustomError.GRAPHQL_ERROR,
    )
  }

  if (resBody?.errors) {
    logger.error(resBody.errors)
    if (resBody.errors[0].type === 'NOT_FOUND') {
      throw new CustomError(
        resBody.errors[0].message || 'Could not fetch user.',
        CustomError.USER_NOT_FOUND,
      )
    }
    if (resBody.errors[0].message) {
      throw new CustomError(wrapTextMultiline(resBody.errors[0].message, 90, 1)[0], res.statusText)
    }
    throw new CustomError(
      'Something went wrong while trying to retrieve the stats data using the GraphQL API.',
      CustomError.GRAPHQL_ERROR,
    )
  }

  const user = (resBody?.data as { user: StatsUser } | undefined)?.user

  if (!user) {
    throw new CustomError('Could not fetch user data.', CustomError.GRAPHQL_ERROR)
  }

  stats.name = user.name || user.login

  if (include_all_commits) {
    stats.totalCommits = await totalCommitsFetcher(username, env)
  } else {
    stats.totalCommits = user.commits.totalCommitContributions
  }

  stats.totalPRs = user.pullRequests.totalCount
  if (include_merged_pull_requests) {
    stats.totalPRsMerged = user.mergedPullRequests?.totalCount ?? 0
    stats.mergedPRsPercentage =
      ((user.mergedPullRequests?.totalCount ?? 0) / user.pullRequests.totalCount) * 100 || 0
  }

  stats.totalReviews = user.reviews.totalPullRequestReviewContributions
  stats.totalIssues = user.openIssues.totalCount + user.closedIssues.totalCount
  if (include_discussions) {
    stats.totalDiscussionsStarted = user.repositoryDiscussions?.totalCount ?? 0
  }
  if (include_discussions_answers) {
    stats.totalDiscussionsAnswered = user.repositoryDiscussionComments?.totalCount ?? 0
  }
  stats.contributedTo = user.repositoriesContributedTo.totalCount

  const allExcludedRepos = [...exclude_repo, ...getExcludeRepositories(env)]
  const repoToHide = new Set(allExcludedRepos)

  stats.totalStars = user.repositories.nodes
    .filter((data) => !repoToHide.has(data.name))
    .reduce((prev, curr) => prev + curr.stargazers.totalCount, 0)

  stats.rank = calculateRank({
    all_commits: include_all_commits,
    commits: stats.totalCommits,
    prs: stats.totalPRs,
    reviews: stats.totalReviews,
    issues: stats.totalIssues,
    repos: user.repositories.totalCount,
    stars: stats.totalStars,
    followers: user.followers.totalCount,
  })

  return stats
}

export { fetchStats }
export default fetchStats
