import {
  GET_DISCUSSION,
  GET_COMMENT_REPLIES,
  SEARCH_DISCUSSIONS,
  GET_REPOSITORY,
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
}

function isNotFoundError(err: unknown): boolean {
  if (!(err instanceof GraphqlResponseError)) return false
  return err.errors?.some((e) => e.type === 'NOT_FOUND') ?? false
}

export class GitHubClient {
  private graphql: typeof graphql

  constructor(config: GitHubClientConfig) {
    this.graphql = graphql.defaults({
      headers: {
        authorization: `token ${config.token}`,
      },
    })
  }

  async getDiscussion(params: {
    owner: string
    repo: string
    number: number
    first?: number
    last?: number
    after?: string
    before?: string
    replyFirst?: number
  }): Promise<Discussion | null> {
    try {
      const data = await this.graphql<{
        repository: { discussion: Discussion | null } | null
      }>(GET_DISCUSSION(params.replyFirst ?? 3), {
        owner: params.owner,
        repo: params.repo,
        number: params.number,
        first: params.first ?? 20,
        last: params.last,
        after: params.after,
        before: params.before,
      })

      return data.repository?.discussion ?? null
    } catch (err) {
      if (isNotFoundError(err)) {
        return null
      }
      throw err
    }
  }

  async getReplies(params: {
    commentId: string
    first?: number
    last?: number
    after?: string
    before?: string
  }): Promise<RepliesResult | null> {
    const data = await this.graphql<{
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

  async searchDiscussions(params: {
    query: string
    first?: number
    last?: number
    after?: string
    before?: string
  }): Promise<DiscussionSearchResult> {
    const data = await this.graphql<{ search: DiscussionSearchResult }>(
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

  async getRepository(params: {
    owner: string
    repo: string
  }): Promise<Repository | null> {
    const data = await this.graphql<{ repository: Repository | null }>(
      GET_REPOSITORY,
      params,
    )

    return data.repository ?? null
  }

  async createDiscussion(params: {
    repositoryId: string
    categoryId: string
    title: string
    body: string
  }): Promise<CreatedDiscussion> {
    const data = await this.graphql<{
      createDiscussion: { discussion: CreatedDiscussion }
    }>(CREATE_DISCUSSION, params)

    return data.createDiscussion.discussion
  }

  async addComment(params: {
    discussionId: string
    body: string
  }): Promise<CreatedComment> {
    const data = await this.graphql<{
      addDiscussionComment: { comment: CreatedComment }
    }>(ADD_DISCUSSION_COMMENT, params)

    return data.addDiscussionComment.comment
  }

  async addReply(params: {
    discussionId: string
    replyToId: string
    body: string
  }): Promise<CreatedReply> {
    const data = await this.graphql<{
      addDiscussionComment: { comment: CreatedReply }
    }>(ADD_DISCUSSION_REPLY, params)

    return data.addDiscussionComment.comment
  }

  async addReaction(params: {
    subjectId: string
    content: ReactionContent
  }): Promise<ToggleReactionResult> {
    const data = await this.graphql<{ addReaction: ToggleReactionResult }>(
      ADD_REACTION,
      params,
    )

    return data.addReaction
  }

  async removeReaction(params: {
    subjectId: string
    content: ReactionContent
  }): Promise<ToggleReactionResult> {
    const data = await this.graphql<{ removeReaction: ToggleReactionResult }>(
      REMOVE_REACTION,
      params,
    )

    return data.removeReaction
  }

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

  async addUpvote(params: { subjectId: string }): Promise<ToggleUpvoteResult> {
    const data = await this.graphql<{ addUpvote: ToggleUpvoteResult }>(
      ADD_UPVOTE,
      params,
    )

    return data.addUpvote
  }

  async removeUpvote(params: {
    subjectId: string
  }): Promise<ToggleUpvoteResult> {
    const data = await this.graphql<{ removeUpvote: ToggleUpvoteResult }>(
      REMOVE_UPVOTE,
      params,
    )

    return data.removeUpvote
  }

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
