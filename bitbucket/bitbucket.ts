import { z } from 'zod'
import type {
  PaginatedResponse,
  PullRequestComment,
  BitbucketPullRequest,
  BitbucketPullRequestDetailed,
  GetPullRequestsQueryOptions,
  BitbucketConfig,
} from './bitbucket.types'

const bitbucketConfigSchema = z.object({
  username: z.string(),
  password: z.string(),
  workspace: z.string(),
  repository: z.string(),
})

export class Bitbucket {
  private username: string
  private password: string
  private workspace: string
  private repository: string
  private baseUrl: string

  private bitbucketApiUrl = 'https://api.bitbucket.org/2.0'

  constructor(config?: Partial<BitbucketConfig>) {
    const { username, password, workspace, repository } = bitbucketConfigSchema.parse({
      username: process.env.BITBUCKET_USERNAME!,
      password: process.env.BITBUCKET_APP_PASSWORD!,
      workspace: process.env.BITBUCKET_WORKSPACE!,
      repository: process.env.BITBUCKET_REPOSITORY!,
      ...config,
    })

    this.username = username
    this.password = password
    this.workspace = workspace
    this.repository = repository
    this.baseUrl = `${this.bitbucketApiUrl}/repositories/${this.workspace}/${this.repository}`
  }

  async crawlPullRequests({
    queryOptions,
    onBeforeProcessingPullRequest,
    onAfterProcessingPullRequest,
  }: {
    onBeforeProcessingPullRequest?: (
      pullRequest: BitbucketPullRequest,
      index: number,
      total: number,
    ) => Promise<{ shouldProcess: boolean }>
    onAfterProcessingPullRequest?: (
      pullRequest: BitbucketPullRequestDetailed & { comments: PullRequestComment[] },
      index: number,
      total: number,
    ) => Promise<void>
    queryOptions: GetPullRequestsQueryOptions
  }) {
    const pullRequests = await this.getPullRequests(queryOptions)

    for (const [index, pullRequest] of pullRequests.entries()) {
      const { shouldProcess } = (await onBeforeProcessingPullRequest?.(pullRequest, index, pullRequests.length)) || {}
      if (!shouldProcess) {
        continue
      }

      const detailedPullRequest = await this.getPullRequest(pullRequest.id)
      const comments = await this.getPullRequestComments(detailedPullRequest.id)
      const pullRequestWithComments = { ...detailedPullRequest, comments }

      await onAfterProcessingPullRequest?.(pullRequestWithComments, index, pullRequests.length)
    }
  }

  async getPullRequestComments(prId: number) {
    const comments: PullRequestComment[] = []

    const response = await this.get<PaginatedResponse<PullRequestComment>>(`/pullrequests/${prId}/comments?pagelen=100`)

    comments.push(...response.values)

    let nextPageUrl = response.next

    while (nextPageUrl) {
      const nextResponse = await this.fetchWithAuth<PaginatedResponse<PullRequestComment>>(nextPageUrl)
      comments.push(...nextResponse.values)

      nextPageUrl = nextResponse.next
    }

    return comments
  }

  async getPullRequests({
    from,
    to,
    withCommentsOnly = false,
    pageSize = 50,
    state = ['OPEN', 'MERGED', 'DECLINED', 'SUPERSEDED'],
  }: GetPullRequestsQueryOptions) {
    const pullRequests: BitbucketPullRequest[] = []

    const filters = [
      from && `created_on>=${from.toISOString()}`,
      to && `created_on<=${to.toISOString()}`,
      withCommentsOnly && 'comment_count>0',
    ].filter(Boolean)

    const query = [
      ...((state.length && state.map((s) => `state=${s}`)) || []),
      pageSize && `pagelen=${pageSize}`,
      filters.length && `q=${filters.join(' AND ')}`,
    ]
      .filter(Boolean)
      .join('&')

    const response = await this.get<PaginatedResponse<BitbucketPullRequest>>(`/pullrequests?${query}`)

    pullRequests.push(...response.values)

    let nextPageUrl = response.next

    while (nextPageUrl) {
      const nextResponse = await this.fetchWithAuth<PaginatedResponse<BitbucketPullRequest>>(nextPageUrl)
      pullRequests.push(...nextResponse.values)

      nextPageUrl = nextResponse.next
    }

    return pullRequests
  }

  async getPullRequest(id: number) {
    return this.get<BitbucketPullRequestDetailed>(`/pullrequests/${id}`)
  }

  async getCommits() {
    return this.post(`/commits`)
  }

  async get<TResponse>(url: string, options: RequestInit = {}) {
    return this.fetchWithAuth<TResponse>(`${this.baseUrl}${url}`, options)
  }

  async post<TResponse>(url: string, options: RequestInit = {}) {
    return this.fetchWithAuth<TResponse>(`${this.baseUrl}${url}`, {
      ...options,
      method: 'POST',
    })
  }

  async fetchWithAuth<TResponse>(url: string, options: RequestInit = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Accept: 'application/json',
        Authorization: `Basic ${btoa(`${this.username}:${this.password}`)}`,
      },
    })

    if (!response.ok) {
      const body = await response.text()

      throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}\n${body}`)
    }

    return (await response.json()) as TResponse
  }
}
