export interface StatsData {
  name: string
  totalPRs: number
  totalPRsMerged: number
  mergedPRsPercentage: number
  totalReviews: number
  totalCommits: number
  totalIssues: number
  totalStars: number
  totalDiscussionsStarted: number
  totalDiscussionsAnswered: number
  contributedTo: number
  rank: { level: string; percentile: number }
}

export interface RepositoryData {
  name: string
  nameWithOwner: string
  isPrivate: boolean
  isArchived: boolean
  isTemplate: boolean
  stargazers: { totalCount: number }
  description: string
  primaryLanguage: { color: string; id: string; name: string } | null
  forkCount: number
  starCount: number
}

export interface Lang {
  name: string
  color: string
  size: number
  count: number
}

export type TopLangData = Record<string, Lang>

export interface StreakData {
  totalContributions: number
  firstContribution: string
  longestStreak: { start: string; end: string; length: number }
  currentStreak: { start: string; end: string; length: number }
}

export interface GraphQLResponse {
  data: unknown
  status: number
  statusText: string
  headers: Headers
}
