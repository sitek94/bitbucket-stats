import {z} from 'zod'
import type {
  PaginatedResponse,
  PullRequestComment,
  BitbucketPullRequest,
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

  async getPullRequests({from}: {from: Date}) {
    const pullRequests: BitbucketPullRequest[] = []

    const response = await this.get<PaginatedResponse<BitbucketPullRequest>>(
      `/pullrequests?pagelen=50&q=created_on>=${from.toISOString()} AND comment_count>0`,
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
