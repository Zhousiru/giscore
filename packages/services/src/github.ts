import {
  GET_DISCUSSION,
  GET_COMMENT_REPLIES,
  SEARCH_DISCUSSIONS,
  GET_REPOSITORY,
  GET_VIEWER,
  CREATE_DISCUSSION,
  ADD_DISCUSSION_COMMENT,
  ADD_DISCUSSION_REPLY,
  ADD_REACTION,
  REMOVE_REACTION,
  ADD_UPVOTE,
  REMOVE_UPVOTE,
} from './queries'
import type {
  Discussion,
  DiscussionSearchResult,
  Repository,
  Viewer,
  CreatedDiscussion,
  CreatedComment,
  CreatedReply,
  ToggleReactionResult,
  ToggleUpvoteResult,
  ReactionContent,
  RepliesResult,
} from './types'
import { graphql, GraphqlResponseError } from '@octokit/graphql'

export interface GitHubClientConfig {
  token: string
  onAuthError?: () => void | Promise<void>
}

function isNotFoundError(err: unknown): boolean {
  if (!(err instanceof GraphqlResponseError)) return false
  return err.errors?.some((e) => e.type === 'NOT_FOUND') ?? false
}

function isAuthError(err: unknown): boolean {
  if (!(err instanceof GraphqlResponseError)) return false
  return (
    err.errors?.some(
      (e) => e.type === 'FORBIDDEN' || e.message?.includes('401'),
    ) ?? false
  )
}

/**
 * Client for interacting with GitHub Discussions via GraphQL API.
 */
export class GitHubClient {
  private queryClient: typeof graphql
  private onAuthError?: () => void | Promise<void>

  /**
   * @param config - Configuration with GitHub personal access token
   */
  constructor(config: GitHubClientConfig) {
    this.queryClient = graphql.defaults({
      headers: {
        authorization: `token ${config.token}`,
      },
    })
    this.onAuthError = config.onAuthError
  }

  private async query<T>(
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<T> {
    try {
      return await this.queryClient<T>(query, variables)
    } catch (err) {
      if (isAuthError(err) && this.onAuthError) {
        await this.onAuthError()
      }
      throw err
    }
  }

  async getViewer(): Promise<Viewer> {
    const data = await this.query<{ viewer: Viewer }>(GET_VIEWER)
    return data.viewer
  }

  /**
   * Fetches a discussion by number.
   * @param params.owner - Repository owner
   * @param params.repo - Repository name
   * @param params.number - Discussion number
   * @param params.first - Number of comments to fetch from start (default: 20)
   * @param params.last - Number of comments to fetch from end
   * @param params.after - Cursor for pagination (forward)
   * @param params.before - Cursor for pagination (backward)
   * @param params.replyFirst - Number of replies to fetch per comment from start
   * @param params.replyLast - Number of replies to fetch per comment from end
   * @returns Discussion or null if not found
   */
  async getDiscussion(params: {
    owner: string
    repo: string
    number: number
    first?: number
    last?: number
    after?: string
    before?: string
    replyFirst?: number
    replyLast?: number
  }): Promise<Discussion | null> {
    try {
      const replyFirst =
        params.replyFirst ?? (params.replyLast === undefined ? 10 : undefined)

      const data = await this.query<{
        repository: { discussion: Discussion | null } | null
      }>(GET_DISCUSSION, {
        owner: params.owner,
        repo: params.repo,
        number: params.number,
        first: params.first ?? 20,
        last: params.last,
        after: params.after,
        before: params.before,
        replyFirst,
        replyLast: params.replyLast,
      })

      return data.repository?.discussion ?? null
    } catch (err) {
      if (isNotFoundError(err)) {
        return null
      }
      throw err
    }
  }

  /**
   * Fetches replies for a specific comment.
   * @param params.commentId - Comment ID
   * @param params.first - Number of replies to fetch from start
   * @param params.last - Number of replies to fetch from end
   * @param params.after - Cursor for pagination (forward)
   * @param params.before - Cursor for pagination (backward)
   * @returns Reply results or null if comment not found
   */
  async getReplies(params: {
    commentId: string
    first?: number
    last?: number
    after?: string
    before?: string
  }): Promise<RepliesResult | null> {
    const data = await this.query<{
      node: { replies: RepliesResult } | null
    }>(GET_COMMENT_REPLIES, {
      id: params.commentId,
      first: params.first ?? 20,
      last: params.last,
      after: params.after,
      before: params.before,
    })

    return data.node?.replies ?? null
  }

  /**
   * Searches discussions across repositories.
   * @param params.query - GitHub search query string
   * @param params.first - Number of results to fetch from start
   * @param params.last - Number of results to fetch from end
   * @param params.after - Cursor for pagination (forward)
   * @param params.before - Cursor for pagination (backward)
   * @returns Search results with discussions
   */
  async searchDiscussions(params: {
    query: string
    first?: number
    last?: number
    after?: string
    before?: string
  }): Promise<DiscussionSearchResult> {
    const data = await this.query<{ search: DiscussionSearchResult }>(
      SEARCH_DISCUSSIONS,
      {
        query: params.query,
        first: params.first ?? (params.last ? undefined : 10),
        last: params.last,
        after: params.after,
        before: params.before,
      },
    )

    return data.search
  }

  /**
   * Fetches repository metadata including discussion categories.
   * @param params.owner - Repository owner
   * @param params.repo - Repository name
   * @returns Repository or null if not found
   */
  async getRepository(params: {
    owner: string
    repo: string
  }): Promise<Repository | null> {
    const data = await this.query<{ repository: Repository | null }>(
      GET_REPOSITORY,
      params,
    )

    return data.repository ?? null
  }

  /**
   * Creates a new discussion in a repository.
   * @param params.repositoryId - Repository ID
   * @param params.categoryId - Discussion category ID
   * @param params.title - Discussion title
   * @param params.body - Discussion body content
   * @returns Created discussion with ID, number, and URL
   */
  async createDiscussion(params: {
    repositoryId: string
    categoryId: string
    title: string
    body: string
  }): Promise<CreatedDiscussion> {
    const data = await this.query<{
      createDiscussion: { discussion: CreatedDiscussion }
    }>(CREATE_DISCUSSION, params)

    return data.createDiscussion.discussion
  }

  /**
   * Adds a comment to a discussion.
   * @param params.discussionId - Discussion ID
   * @param params.body - Comment body content
   * @returns Created comment
   */
  async addComment(params: {
    discussionId: string
    body: string
  }): Promise<CreatedComment> {
    const data = await this.query<{
      addDiscussionComment: { comment: CreatedComment }
    }>(ADD_DISCUSSION_COMMENT, {
      discussionId: params.discussionId,
      body: params.body,
      replyFirst: 0,
    })

    return data.addDiscussionComment.comment
  }

  /**
   * Adds a reply to a comment in a discussion.
   * @param params.discussionId - Discussion ID
   * @param params.replyToId - Comment ID to reply to
   * @param params.body - Reply body content
   * @returns Created reply
   */
  async addReply(params: {
    discussionId: string
    replyToId: string
    body: string
  }): Promise<CreatedReply> {
    const data = await this.query<{
      addDiscussionComment: { comment: CreatedReply }
    }>(ADD_DISCUSSION_REPLY, params)

    return data.addDiscussionComment.comment
  }

  /**
   * Adds a reaction to a comment or discussion.
   * @param params.subjectId - ID of the comment or discussion
   * @param params.content - Reaction type (e.g., THUMBS_UP, HEART)
   * @returns Reaction result
   */
  async addReaction(params: {
    subjectId: string
    content: ReactionContent
  }): Promise<ToggleReactionResult> {
    const data = await this.query<{ addReaction: ToggleReactionResult }>(
      ADD_REACTION,
      params,
    )

    return data.addReaction
  }

  /**
   * Removes a reaction from a comment or discussion.
   * @param params.subjectId - ID of the comment or discussion
   * @param params.content - Reaction type to remove
   * @returns Reaction result
   */
  async removeReaction(params: {
    subjectId: string
    content: ReactionContent
  }): Promise<ToggleReactionResult> {
    const data = await this.query<{ removeReaction: ToggleReactionResult }>(
      REMOVE_REACTION,
      params,
    )

    return data.removeReaction
  }

  /**
   * Toggles a reaction on a comment or discussion.
   * @param params.subjectId - ID of the comment or discussion
   * @param params.content - Reaction type to toggle
   * @param params.viewerHasReacted - Whether the viewer has already reacted
   * @returns Reaction result
   */
  async toggleReaction(params: {
    subjectId: string
    content: ReactionContent
    viewerHasReacted: boolean
  }): Promise<ToggleReactionResult> {
    if (params.viewerHasReacted) {
      return this.removeReaction({
        subjectId: params.subjectId,
        content: params.content,
      })
    }
    return this.addReaction({
      subjectId: params.subjectId,
      content: params.content,
    })
  }

  /**
   * Adds an upvote to a comment.
   * @param params.subjectId - Comment ID
   * @returns Upvote result with updated count
   */
  async addUpvote(params: { subjectId: string }): Promise<ToggleUpvoteResult> {
    const data = await this.query<{ addUpvote: ToggleUpvoteResult }>(
      ADD_UPVOTE,
      params,
    )

    return data.addUpvote
  }

  /**
   * Removes an upvote from a comment.
   * @param params.subjectId - Comment ID
   * @returns Upvote result with updated count
   */
  async removeUpvote(params: {
    subjectId: string
  }): Promise<ToggleUpvoteResult> {
    const data = await this.query<{ removeUpvote: ToggleUpvoteResult }>(
      REMOVE_UPVOTE,
      params,
    )

    return data.removeUpvote
  }

  /**
   * Toggles an upvote on a comment.
   * @param params.subjectId - Comment ID
   * @param params.viewerHasUpvoted - Whether the viewer has already upvoted
   * @returns Upvote result with updated count
   */
  async toggleUpvote(params: {
    subjectId: string
    viewerHasUpvoted: boolean
  }): Promise<ToggleUpvoteResult> {
    if (params.viewerHasUpvoted) {
      return this.removeUpvote({ subjectId: params.subjectId })
    }
    return this.addUpvote({ subjectId: params.subjectId })
  }
}
