import {z} from 'zod'
import type {
  PaginatedResponse,
  PullRequestComment,
  BitbucketPullRequest,
  BitbucketUser,
  Participant,
} from './bitbucket.types'

const configSchema = z.object({
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

  constructor(config: {
    auth: {username: string; password: string}
    project: {workspace: string; repository: string}
  }) {
    const {auth, project} = configSchema.parse(config)

    this.username = auth.username
    this.password = auth.password
    this.workspace = project.workspace
    this.repository = project.repository
    this.baseUrl = `${this.bitbucketApiUrl}/repositories/${this.workspace}/${this.repository}`
  }

  async crawlPullRequests({
    from,
    to,
    withComments,
    pageSize,
    onPullRequestAuthor,
    onPullRequest,
    onComment,
    onParticipant,
  }: Parameters<Bitbucket['getPullRequests']>[0] & {
    onPullRequestAuthor: (author: BitbucketUser) => void
    onPullRequest: (pullRequest: BitbucketPullRequest) => void
    onComment: (comment: PullRequestComment) => void
    onParticipant: (participant: Participant) => void
  }) {
    const pullRequests = await this.getPullRequests({
      from,
      to,
      withComments,
      pageSize,
    })

    for (const {id: pullRequestId} of pullRequests) {
      const pullRequest = await this.getPullRequest(pullRequestId)

      onPullRequestAuthor(pullRequest.author)
      onPullRequest(pullRequest)

      const comments = await this.getPullRequestComments(pullRequestId)

      for (const comment of comments) {
        onComment(comment)
      }

      for (const participant of pullRequest.participants) {
        onParticipant(participant)
      }
    }
  }

  async getPullRequestComments(prId: number) {
    const comments: PullRequestComment[] = []

    const response = await this.get<PaginatedResponse<PullRequestComment>>(
      `/pullrequests/${prId}/comments?pagelen=100`,
    )

    console.log(`Fetched ${response.values.length} comments`)

    comments.push(...response.values)

    let nextPageUrl = response.next

    while (nextPageUrl) {
      const nextResponse = await this.fetchWithAuth<
        PaginatedResponse<PullRequestComment>
      >(nextPageUrl)
      comments.push(...nextResponse.values)

      console.log(`Fetched ${nextResponse.values.length} comments`)

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
    from: Date
    to: Date
    withComments: boolean
    pageSize: number
  }) {
    // Participants and reviewers are not exposed
    // https://jira.atlassian.com/browse/BCLOUD-22389
    const pullRequests: Omit<
      BitbucketPullRequest,
      'participants' | 'reviewers'
    >[] = []

    const filters = [
      `pagelen=${pageSize}`,
      from && `created_on>=${from.toISOString()}`,
      to && `created_on<=${to.toISOString()}`,
      withComments && 'comment_count>0',
    ].filter(Boolean)

    const response = await this.get<PaginatedResponse<BitbucketPullRequest>>(
      `/pullrequests?${filters.join('&')}`,
    )

    console.log(`Fetched ${response.values.length} pull requests`)

    pullRequests.push(...response.values)

    let nextPageUrl = response.next

    while (nextPageUrl) {
      const nextResponse = await this.fetchWithAuth<
        PaginatedResponse<BitbucketPullRequest>
      >(nextPageUrl)
      pullRequests.push(...nextResponse.values)

      console.log(`Fetched ${nextResponse.values.length} pull requests`)

      nextPageUrl = nextResponse.next
    }

    return pullRequests
  }

  async getPullRequest(id: number) {
    return this.get<BitbucketPullRequest>(`/pullrequests/${id}`)
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

      throw new Error(
        `Failed to fetch ${url}: ${response.status} ${response.statusText}\n${body}`,
      )
    }

    return (await response.json()) as TResponse
  }
}
