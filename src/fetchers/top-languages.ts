import { retryer } from '../common/retryer.js'
import { logger } from '../common/log.js'
import { getExcludeRepositories } from '../common/envs.js'
import { CustomError, MissingParamError } from '../common/error.js'
import { wrapTextMultiline } from '../common/fmt.js'
import { request } from '../common/http.js'
import type { TopLangData, GraphQLResponse } from './types.js'

type GraphQLError = { type?: string; message?: string }
type ResponseBody = { data?: unknown; errors?: GraphQLError[] } | null

const fetcher = (variables: unknown, token: string): Promise<GraphQLResponse> => {
  return request(
    {
      query: `
      query userInfo($login: String!) {
        user(login: $login) {
          repositories(ownerAffiliations: OWNER, isFork: false, first: 100) {
            nodes {
              name
              languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
                edges {
                  size
                  node {
                    color
                    name
                  }
                }
              }
            }
          }
        }
      }
      `,
      variables,
    },
    {
      Authorization: `token ${token}`,
    },
  )
}

type LangEdge = { size: number; node: { color: string; name: string } }
type RepoNode = { name: string; size?: number; languages: { edges: LangEdge[] } }

const fetchTopLanguages = async (
  username: string,
  exclude_repo: string[] = [],
  size_weight: number | string = 1,
  count_weight: number | string = 0,
  env: Record<string, unknown> = {},
): Promise<TopLangData> => {
  if (!username) {
    throw new MissingParamError(['username'])
  }

  const res = await retryer(fetcher, { login: username }, env) as GraphQLResponse
  const resBody = res.data as ResponseBody

  if (resBody === null) {
    throw new CustomError(
      `GitHub API returned HTTP ${res.status}: ${res.statusText}`,
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
      'Something went wrong while trying to retrieve the language data using the GraphQL API.',
      CustomError.GRAPHQL_ERROR,
    )
  }

  let repoNodes = ((resBody?.data as {
    user: { repositories: { nodes: RepoNode[] } }
  } | undefined)?.user.repositories.nodes ?? [])

  const repoToHide: Record<string, boolean> = {}
  const allExcludedRepos = [...exclude_repo, ...getExcludeRepositories(env)]

  allExcludedRepos.forEach((repoName) => {
    repoToHide[repoName] = true
  })

  repoNodes = repoNodes.sort((a, b) => (b.size ?? 0) - (a.size ?? 0)).filter((name) => !repoToHide[name.name])

  let repoCount = 0

  const reducedRepoNodes = repoNodes
    .filter((node) => node.languages.edges.length > 0)
    .reduce((acc: LangEdge[], curr) => curr.languages.edges.concat(acc), [])
    .reduce((acc: TopLangData, prev: LangEdge) => {
      let langSize = prev.size

      if (acc[prev.node.name] && prev.node.name === acc[prev.node.name].name) {
        langSize = prev.size + acc[prev.node.name].size
        repoCount += 1
      } else {
        repoCount = 1
      }

      return {
        ...acc,
        [prev.node.name]: {
          name: prev.node.name,
          color: prev.node.color,
          size: langSize,
          count: repoCount,
        },
      }
    }, {})

  Object.keys(reducedRepoNodes).forEach((name) => {
    reducedRepoNodes[name].size =
      Math.pow(reducedRepoNodes[name].size, Number(size_weight)) *
      Math.pow(reducedRepoNodes[name].count, Number(count_weight))
  })

  const topLangs: TopLangData = Object.keys(reducedRepoNodes)
    .sort((a, b) => reducedRepoNodes[b].size - reducedRepoNodes[a].size)
    .reduce((result: TopLangData, key) => {
      result[key] = reducedRepoNodes[key]
      return result
    }, {})

  return topLangs
}

export { fetchTopLanguages }
export default fetchTopLanguages
