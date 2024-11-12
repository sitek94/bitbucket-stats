////////////////////////////////////////
// Bitbucket API types
// https://dac-static.atlassian.com/cloud/bitbucket/swagger.v3.json?_v=2.300.71-0.1311.0
////////////////////////////////////////

type Link = {
  href: string
  name: string
}

type Links = {
  self: Link
  html: Link
  commits: Link
  approve: Link
  diff: Link
  diffstat: Link
  comments: Link
  activity: Link
  merge: Link
  decline: Link
}

type RenderedContent = {
  raw: string
  markup: 'markdown'
  html: string
}

type Rendered = {
  title: RenderedContent
  description: RenderedContent
  reason: RenderedContent
}

type Repository = {
  type: string
  full_name: string
  name: string
  uuid: string
}

type Branch = {
  name: string
  merge_strategies: Array<
    'merge_commit' | 'squash' | 'fast_forward' | 'squash_fast_forward' | 'rebase_fast_forward' | 'rebase_merge'
  >
  default_merge_strategy: string
}

type Commit = {
  hash: string
  links?: {
    self: Link
    html: Link
  }
}

type SourceDestination = {
  repository: Repository
  branch: Branch
  commit: Commit
}

export type BitbucketUser = {
  uuid: string
  display_name: string
  nickname?: string
  account_id: string
  links: {
    self: Link
    html: Link
    avatar: Link
  }
}

type ParticipantRole = 'PARTICIPANT' | 'REVIEWER'
type ParticipantState = 'approved' | 'changes_requested' | null

export type Participant = {
  user: BitbucketUser
  role: ParticipantRole
  approved: boolean
  state: ParticipantState
  participated_on: string // ISO8601 timestamp
}

export type BitbucketPullRequest = {
  type: string
  links: Links
  id: number
  title: string
  rendered: Rendered
  summary: RenderedContent
  state: 'OPEN' | 'MERGED' | 'DECLINED' | 'SUPERSEDED'
  author: BitbucketUser
  source: SourceDestination
  destination: SourceDestination
  merge_commit: Commit | null
  comment_count: number
  task_count: number
  close_source_branch: boolean
  closed_by: BitbucketUser | null
  reason: string | null
  created_on: string // ISO8601 timestamp
  updated_on: string // ISO8601 timestamp
}

// Participants and reviewers are not exposed
// https://jira.atlassian.com/browse/BCLOUD-22389
export type BitbucketPullRequestDetailed = BitbucketPullRequest & {
  reviewers: BitbucketUser[]
  participants: Participant[]
}

export type PullRequestUpdate = Partial<
  Pick<BitbucketPullRequest, 'title' | 'summary' | 'state' | 'reason' | 'close_source_branch'>
>

export type MergeStrategy =
  | 'merge_commit'
  | 'squash'
  | 'fast_forward'
  | 'squash_fast_forward'
  | 'rebase_fast_forward'
  | 'rebase_merge'

export type PullRequestMergeParameters = {
  type: string
  message?: string
  close_source_branch?: boolean
  merge_strategy?: MergeStrategy
}

type CommentContent = {
  raw: string
  markup?: string
  html?: string
}

type CommentResolution = {
  type: string
  resolved: boolean
  resolved_on?: string
  resolved_by?: BitbucketUser
}

export type PullRequestComment = {
  id: number
  type: string
  created_on: string
  updated_on: string
  content: CommentContent
  user: BitbucketUser
  deleted: boolean
  parent?: PullRequestComment
  inline?: {
    path: string
    from?: number | null
    to?: number | null
    outdated?: boolean
  }
  pullrequest: BitbucketPullRequest
  links: {
    self: Link
    html: Link
  }
  resolution?: CommentResolution
  pending: boolean
}

export type PaginatedResponse<T> = {
  size: number
  page: number
  pagelen: number
  next?: string
  previous?: string
  values: T[]
}

////////////////////////////////////////
// Local types
////////////////////////////////////////

export type BitbucketConfig = {
  username: string
  password: string
  workspace: string
  repository: string
}

export type GetPullRequestsQueryOptions = {
  from?: Date
  to?: Date
  withCommentsOnly?: boolean
  pageSize?: number
  state?: ('OPEN' | 'MERGED' | 'DECLINED' | 'SUPERSEDED')[]
}
