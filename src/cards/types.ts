export type ThemeNames = string

export interface CommonOptions {
  title_color?: string
  icon_color?: string
  text_color?: string
  bg_color?: string
  theme?: string
  border_radius?: number | string
  border_color?: string
  locale?: string | null
  hide_border?: boolean
}

export interface StatCardOptions extends CommonOptions {
  hide?: string[]
  show_icons?: boolean
  hide_title?: boolean
  card_width?: number
  hide_rank?: boolean
  include_all_commits?: boolean
  commits_year?: number
  line_height?: number | string
  custom_title?: string
  disable_animations?: boolean
  number_format?: string
  number_precision?: number
  ring_color?: string
  text_bold?: boolean
  rank_icon?: string
  show?: string[]
}

export interface RepoCardOptions extends CommonOptions {
  show_owner?: boolean
  description_lines_count?: number
}

export interface TopLangOptions extends CommonOptions {
  hide_title?: boolean
  card_width?: number
  hide?: string[]
  layout?: 'compact' | 'normal' | 'donut' | 'donut-vertical' | 'pie'
  custom_title?: string
  langs_count?: number
  disable_animations?: boolean
  hide_progress?: boolean
  stats_format?: 'percentages' | 'bytes'
}

export interface StreakCardOptions extends CommonOptions {
  disable_animations?: boolean
}

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
}

export type TopLangData = Record<string, Lang>

export interface StreakData {
  totalContributions: number
  firstContribution: string
  longestStreak: { start: string; end: string; length: number }
  currentStreak: { start: string; end: string; length: number }
}
