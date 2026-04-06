// @ts-check

import { retryer } from "../common/retryer.js";
import { logger } from "../common/log.js";
import { getExcludeRepositories } from "../common/envs.js";
import { CustomError, MissingParamError } from "../common/error.js";
import { wrapTextMultiline } from "../common/fmt.js";
import { request } from "../common/http.js";

const fetcher = (variables, token) => {
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
  );
};

const fetchTopLanguages = async (
  username,
  exclude_repo = [],
  size_weight = 1,
  count_weight = 0,
  env = {},
) => {
  if (!username) {
    throw new MissingParamError(["username"]);
  }

  const res = await retryer(fetcher, { login: username }, env);

  if (res.data === null) {
    throw new CustomError(
      `GitHub API returned HTTP ${res.status}: ${res.statusText}`,
      CustomError.GRAPHQL_ERROR,
    );
  }

  if (res.data.errors) {
    logger.error(res.data.errors);
    if (res.data.errors[0].type === "NOT_FOUND") {
      throw new CustomError(
        res.data.errors[0].message || "Could not fetch user.",
        CustomError.USER_NOT_FOUND,
      );
    }
    if (res.data.errors[0].message) {
      throw new CustomError(
        wrapTextMultiline(res.data.errors[0].message, 90, 1)[0],
        res.statusText,
      );
    }
    throw new CustomError(
      "Something went wrong while trying to retrieve the language data using the GraphQL API.",
      CustomError.GRAPHQL_ERROR,
    );
  }

  let repoNodes = res.data.data.user.repositories.nodes;
  const repoToHide = {};
  const allExcludedRepos = [...exclude_repo, ...getExcludeRepositories(env)];

  allExcludedRepos.forEach((repoName) => {
    repoToHide[repoName] = true;
  });

  repoNodes = repoNodes
    .sort((a, b) => b.size - a.size)
    .filter((name) => !repoToHide[name.name]);

  let repoCount = 0;

  const reducedRepoNodes = repoNodes
    .filter((node) => node.languages.edges.length > 0)
    .reduce((acc, curr) => curr.languages.edges.concat(acc), [])
    .reduce((acc, prev) => {
      let langSize = prev.size;

      if (acc[prev.node.name] && prev.node.name === acc[prev.node.name].name) {
        langSize = prev.size + acc[prev.node.name].size;
        repoCount += 1;
      } else {
        repoCount = 1;
      }

      return {
        ...acc,
        [prev.node.name]: {
          name: prev.node.name,
          color: prev.node.color,
          size: langSize,
          count: repoCount,
        },
      };
    }, {});

  Object.keys(reducedRepoNodes).forEach((name) => {
    reducedRepoNodes[name].size =
      Math.pow(reducedRepoNodes[name].size, size_weight) *
      Math.pow(reducedRepoNodes[name].count, count_weight);
  });

  const topLangs = Object.keys(reducedRepoNodes)
    .sort((a, b) => reducedRepoNodes[b].size - reducedRepoNodes[a].size)
    .reduce((result, key) => {
      result[key] = reducedRepoNodes[key];
      return result;
    }, {});

  return topLangs;
};

export { fetchTopLanguages };
export default fetchTopLanguages;
