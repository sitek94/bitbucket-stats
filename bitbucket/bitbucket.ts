import { z } from 'zod'
import type {
  PaginatedResponse,
  PullRequestComment,
  BitbucketPullRequest,
  BitbucketPullRequestDetailed,
} from './bitbucket.types'

const bitbucketConfigSchema = z.object({
  auth: z.object({
    username: z.string(),
    password: z.string(),
  }),
  project: z.object({
    workspace: z.string(),
    repository: z.string(),
  }),
})

export class Bitbucket {
  private username: string
  private password: string
  private workspace: string
  private repository: string
  private baseUrl: string

  private bitbucketApiUrl = 'https://api.bitbucket.org/2.0'

  constructor(bitbucketConfig: {
    auth: { username: string; password: string }
    project: { workspace: string; repository: string }
  }) {
    const { auth, project } = bitbucketConfigSchema.parse(bitbucketConfig)

    this.username = auth.username
    this.password = auth.password
    this.workspace = project.workspace
    this.repository = project.repository
    this.baseUrl = `${this.bitbucketApiUrl}/repositories/${this.workspace}/${this.repository}`
  }

  async crawlPullRequests({
    onBeforeProcessingPullRequest,
    onAfterProcessingPullRequest,
    ...options
  }: {
    from?: Date
    to?: Date
    withComments?: boolean
    pageSize?: number

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
  }) {
    const pullRequests = await this.getPullRequests(options)

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
    from = new Date(),
    to,
    withComments = true,
    pageSize = 50,
  }: {
    from?: Date
    to?: Date
    withComments?: boolean
    pageSize?: number
  }) {
    const pullRequests: BitbucketPullRequest[] = []

    const filters = [
      `pagelen=${pageSize}`,
      from && `created_on>=${from.toISOString()}`,
      to && `created_on<=${to.toISOString()}`,
      withComments && 'comment_count>0',
    ].filter(Boolean)

    const response = await this.get<PaginatedResponse<BitbucketPullRequest>>(`/pullrequests?${filters.join('&')}`)

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
