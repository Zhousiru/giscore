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

const GITHUB_GRAPHQL_API = 'https://api.github.com/graphql'

interface ApiResponse<T> {
  data?: T
  error?: string
}

interface GraphQLResponse<T> {
  data?: T
  errors?: Array<{ message: string }>
}

const VIEWER_QUERY = `
  query {
    viewer {
      login
      avatarUrl
      url
    }
  }
`

const ADD_COMMENT_MUTATION = `
  mutation AddDiscussionComment($discussionId: ID!, $body: String!) {
    addDiscussionComment(input: { discussionId: $discussionId, body: $body }) {
      comment {
        id
        upvoteCount
        viewerHasUpvoted
        viewerCanUpvote
        author { avatarUrl login url }
        viewerDidAuthor
        createdAt
        url
        authorAssociation
        lastEditedAt
        deletedAt
        isMinimized
        bodyHTML
        reactionGroups {
          content
          users { totalCount }
          viewerHasReacted
        }
        replies(first: 3) {
          totalCount
          pageInfo {
            startCursor
            endCursor
            hasNextPage
            hasPreviousPage
          }
          nodes {
            id
            author { avatarUrl login url }
            viewerDidAuthor
            createdAt
            url
            authorAssociation
            lastEditedAt
            deletedAt
            isMinimized
            bodyHTML
            reactionGroups {
              content
              users { totalCount }
              viewerHasReacted
            }
            replyTo { id }
          }
        }
      }
    }
  }
`

const ADD_REPLY_MUTATION = `
  mutation AddDiscussionReply($discussionId: ID!, $replyToId: ID!, $body: String!) {
    addDiscussionComment(input: { discussionId: $discussionId, replyToId: $replyToId, body: $body }) {
      comment {
        id
        author { avatarUrl login url }
        viewerDidAuthor
        createdAt
        url
        authorAssociation
        lastEditedAt
        deletedAt
        isMinimized
        bodyHTML
        reactionGroups {
          content
          users { totalCount }
          viewerHasReacted
        }
        replyTo { id }
      }
    }
  }
`

const ADD_REACTION_MUTATION = `
  mutation AddReaction($subjectId: ID!, $content: ReactionContent!) {
    addReaction(input: { subjectId: $subjectId, content: $content }) {
      reaction { id content }
    }
  }
`

const REMOVE_REACTION_MUTATION = `
  mutation RemoveReaction($subjectId: ID!, $content: ReactionContent!) {
    removeReaction(input: { subjectId: $subjectId, content: $content }) {
      reaction { id content }
    }
  }
`

const ADD_UPVOTE_MUTATION = `
  mutation AddUpvote($subjectId: ID!) {
    addUpvote(input: { subjectId: $subjectId }) {
      subject { upvoteCount }
    }
  }
`

const REMOVE_UPVOTE_MUTATION = `
  mutation RemoveUpvote($subjectId: ID!) {
    removeUpvote(input: { subjectId: $subjectId }) {
      subject { upvoteCount }
    }
  }
`

export class GiscoreClient {
  private config: GiscoreConfig

  constructor(config: GiscoreConfig) {
    this.config = config
  }

  updateToken(token: string | undefined) {
    this.config = { ...this.config, token }
  }

  get isAuthenticated(): boolean {
    return !!this.config.token
  }

  private async graphql<T>(
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<T> {
    if (!this.config.token) {
      throw new Error('Authentication required')
    }

    const response = await fetch(GITHUB_GRAPHQL_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    })

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`)
    }

    const result: GraphQLResponse<T> = await response.json()

    if (result.errors && result.errors.length > 0) {
      throw new Error(result.errors[0]?.message ?? 'GraphQL error')
    }

    if (!result.data) {
      throw new Error('No data returned')
    }

    return result.data
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
    const data = await this.graphql<{ viewer: Viewer }>(VIEWER_QUERY)
    return data.viewer
  }

  async addComment(
    discussionId: string,
    body: string,
  ): Promise<CreatedComment> {
    const data = await this.graphql<{
      addDiscussionComment: { comment: CreatedComment }
    }>(ADD_COMMENT_MUTATION, { discussionId, body })

    return data.addDiscussionComment.comment
  }

  async addReply(
    discussionId: string,
    replyToId: string,
    body: string,
  ): Promise<CreatedReply> {
    const data = await this.graphql<{
      addDiscussionComment: { comment: CreatedReply }
    }>(ADD_REPLY_MUTATION, { discussionId, replyToId, body })

    return data.addDiscussionComment.comment
  }

  async toggleReaction(
    subjectId: string,
    content: ReactionContent,
    hasReacted: boolean,
  ): Promise<ToggleReactionResult> {
    if (hasReacted) {
      const data = await this.graphql<{ removeReaction: ToggleReactionResult }>(
        REMOVE_REACTION_MUTATION,
        { subjectId, content },
      )
      return data.removeReaction
    }

    const data = await this.graphql<{ addReaction: ToggleReactionResult }>(
      ADD_REACTION_MUTATION,
      { subjectId, content },
    )
    return data.addReaction
  }

  async toggleUpvote(
    subjectId: string,
    hasUpvoted: boolean,
  ): Promise<ToggleUpvoteResult> {
    if (hasUpvoted) {
      const data = await this.graphql<{ removeUpvote: ToggleUpvoteResult }>(
        REMOVE_UPVOTE_MUTATION,
        { subjectId },
      )
      return data.removeUpvote
    }

    const data = await this.graphql<{ addUpvote: ToggleUpvoteResult }>(
      ADD_UPVOTE_MUTATION,
      { subjectId },
    )
    return data.addUpvote
  }

  // === Auth ===

  getLoginUrl(redirectUri: string): string {
    const params = new URLSearchParams({ redirect_uri: redirectUri })
    return `${this.config.serverUrl}/oauth/authorize?${params}`
  }
}
