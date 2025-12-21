import type {
  GiscoreConfig,
  Discussion,
  DiscussionSearchResult,
  CreatedDiscussion,
  CreatedComment,
  CreatedReply,
  ReactionContent,
  ToggleReactionResult,
  ToggleUpvoteResult,
  PaginationParams,
  Viewer,
  RepliesResult,
} from './types'
import { GitHubClient } from '@giscore/services'

interface ApiResponse<T> {
  data?: T
  error?: string
}

export class GiscoreClient {
  private config: GiscoreConfig
  private githubClient: GitHubClient | undefined

  constructor(config: GiscoreConfig) {
    this.config = config
    this.githubClient = config.token
      ? new GitHubClient({ token: config.token })
      : undefined
  }

  updateToken(token: string | undefined) {
    this.config = { ...this.config, token }
    this.githubClient = token ? new GitHubClient({ token }) : undefined
  }

  get isAuthenticated(): boolean {
    return !!this.config.token
  }

  private getGitHubClient(): GitHubClient {
    if (!this.githubClient) {
      throw new Error('Authentication required')
    }
    return this.githubClient
  }

  private async serverFetch<T>(
    path: string,
    options?: RequestInit,
  ): Promise<T | null> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    if (this.config.token) {
      headers['Authorization'] = `Bearer ${this.config.token}`
    }

    const response = await fetch(`${this.config.serverUrl}${path}`, {
      ...options,
      headers: { ...headers, ...options?.headers },
    })

    if (!response.ok) {
      if (response.status === 404) return null
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || response.statusText)
    }

    const result: ApiResponse<T> = await response.json()
    if (result.error) throw new Error(result.error)
    return result.data ?? null
  }

  // === Read operations (via server with GitHub App) ===

  async getDiscussion(
    number: number,
    pagination?: PaginationParams & { replyFirst?: number },
  ): Promise<Discussion | null> {
    const params = new URLSearchParams({
      repo: this.config.repo,
      number: String(number),
    })

    if (pagination?.first) params.set('first', String(pagination.first))
    if (pagination?.last) params.set('last', String(pagination.last))
    if (pagination?.after) params.set('after', pagination.after)
    if (pagination?.before) params.set('before', pagination.before)
    if (pagination?.replyFirst)
      params.set('replyFirst', String(pagination.replyFirst))

    return this.serverFetch<Discussion>(`/discussion?${params}`)
  }

  async getReplies(
    commentId: string,
    pagination?: PaginationParams,
  ): Promise<RepliesResult | null> {
    const params = new URLSearchParams({
      repo: this.config.repo,
      commentId,
    })

    if (pagination?.first) params.set('first', String(pagination.first))
    if (pagination?.last) params.set('last', String(pagination.last))
    if (pagination?.after) params.set('after', pagination.after)
    if (pagination?.before) params.set('before', pagination.before)

    return this.serverFetch<RepliesResult>(`/discussion/replies?${params}`)
  }

  async searchDiscussions(
    term: string,
    pagination?: PaginationParams,
  ): Promise<DiscussionSearchResult | null> {
    const params = new URLSearchParams({
      repo: this.config.repo,
      term,
    })

    if (this.config.category) params.set('category', this.config.category)
    if (this.config.strict) params.set('strict', 'true')
    if (pagination?.first) params.set('first', String(pagination.first))
    if (pagination?.last) params.set('last', String(pagination.last))
    if (pagination?.after) params.set('after', pagination.after)
    if (pagination?.before) params.set('before', pagination.before)

    return this.serverFetch<DiscussionSearchResult>(`/discussion?${params}`)
  }

  async createDiscussion(
    title: string,
    body: string,
  ): Promise<CreatedDiscussion> {
    if (!this.config.category) {
      throw new Error('Category is required to create a discussion')
    }

    const result = await this.serverFetch<CreatedDiscussion>('/discussion', {
      method: 'POST',
      body: JSON.stringify({
        repo: this.config.repo,
        category: this.config.category,
        title,
        body,
      }),
    })

    if (!result) throw new Error('Failed to create discussion')
    return result
  }

  // === Write operations (direct GitHub API with user token) ===

  async getViewer(): Promise<Viewer> {
    return this.getGitHubClient().getViewer()
  }

  async addComment(
    discussionId: string,
    body: string,
  ): Promise<CreatedComment> {
    return this.getGitHubClient().addComment({ discussionId, body })
  }

  async addReply(
    discussionId: string,
    replyToId: string,
    body: string,
  ): Promise<CreatedReply> {
    return this.getGitHubClient().addReply({ discussionId, replyToId, body })
  }

  async toggleReaction(
    subjectId: string,
    content: ReactionContent,
    hasReacted: boolean,
  ): Promise<ToggleReactionResult> {
    return this.getGitHubClient().toggleReaction({
      subjectId,
      content,
      viewerHasReacted: hasReacted,
    })
  }

  async toggleUpvote(
    subjectId: string,
    hasUpvoted: boolean,
  ): Promise<ToggleUpvoteResult> {
    return this.getGitHubClient().toggleUpvote({
      subjectId,
      viewerHasUpvoted: hasUpvoted,
    })
  }

  // === Auth ===

  getLoginUrl(redirectUri: string): string {
    const params = new URLSearchParams({ redirect_uri: redirectUri })
    return `${this.config.serverUrl}/oauth/authorize?${params}`
  }
}
