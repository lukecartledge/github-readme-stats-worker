const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql'

interface GraphQLResponse {
  data: unknown
  status: number
  statusText: string
  headers: Headers
}

/** Send GraphQL request to GitHub API. */
const request = async (data: unknown, headers: Record<string, string>): Promise<GraphQLResponse> => {
  const response = await fetch(GITHUB_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'github-readme-stats-worker',
      ...headers,
    },
    body: JSON.stringify(data),
  })

  let parsedBody: unknown = null
  try {
    parsedBody = await response.json()
  } catch {
    parsedBody = null
  }

  return {
    data: parsedBody,
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  }
}

export { request }
