// @ts-check

const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";

/**
 * Send GraphQL request to GitHub API.
 *
 * @param {any} data Request data.
 * @param {Record<string, string>} headers Request headers.
 * @returns {Promise<any>} Request response.
 */
const request = async (data, headers) => {
  const response = await fetch(GITHUB_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "github-readme-stats-worker",
      ...headers,
    },
    body: JSON.stringify(data),
  });

  let parsedBody = null;
  try {
    parsedBody = await response.json();
  } catch {
    parsedBody = null;
  }

  return {
    data: parsedBody,
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  };
};

export { request };
