import { MissingParamError } from '../common/error.js'
import { request } from '../common/http.js'
import { retryer } from '../common/retryer.js'
import type { RepositoryData, GraphQLResponse } from './types.js'

type RepoQueryData = {
  user: { repository: (Omit<RepositoryData, 'starCount'> & { stargazers: { totalCount: number } }) | null } | null
  organization: { repository: (Omit<RepositoryData, 'starCount'> & { stargazers: { totalCount: number } }) | null } | null
}

type RepoResponseBody = {
  data?: RepoQueryData
  errors?: Array<{ type?: string; message?: string }>
} | null

const fetcher = (variables: unknown, token: string): Promise<GraphQLResponse> => {
  return request(
    {
      query: `
      fragment RepoInfo on Repository {
        name
        nameWithOwner
        isPrivate
        isArchived
        isTemplate
        stargazers {
          totalCount
        }
        description
        primaryLanguage {
          color
          id
          name
        }
        forkCount
      }
      query getRepo($login: String!, $repo: String!) {
        user(login: $login) {
          repository(name: $repo) {
            ...RepoInfo
          }
        }
        organization(login: $login) {
          repository(name: $repo) {
            ...RepoInfo
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

const urlExample = '/api/pin?username=USERNAME&amp;repo=REPO_NAME'

const fetchRepo = async (
  username: string,
  reponame: string,
  env: Record<string, unknown> = {},
): Promise<RepositoryData> => {
  if (!username && !reponame) {
    throw new MissingParamError(['username', 'repo'], urlExample)
  }
  if (!username) {
    throw new MissingParamError(['username'], urlExample)
  }
  if (!reponame) {
    throw new MissingParamError(['repo'], urlExample)
  }

  const res = await retryer(fetcher, { login: username, repo: reponame }, env) as GraphQLResponse
  const resBody = res.data as RepoResponseBody

  const data = resBody?.data

  if (!data?.user && !data?.organization) {
    throw new Error('Not found')
  }

  const isUser = data?.organization === null && data?.user
  const isOrg = data?.user === null && data?.organization

  if (isUser) {
    if (!data.user?.repository || data.user.repository.isPrivate) {
      throw new Error('User Repository Not found')
    }
    return {
      ...data.user.repository,
      starCount: data.user.repository.stargazers.totalCount,
    }
  }

  if (isOrg) {
    if (!data.organization?.repository || data.organization.repository.isPrivate) {
      throw new Error('Organization Repository Not found')
    }
    return {
      ...data.organization.repository,
      starCount: data.organization.repository.stargazers.totalCount,
    }
  }

  throw new Error('Unexpected behavior')
}

export { fetchRepo }
export default fetchRepo
