export type ReactionContent =
  | 'THUMBS_UP'
  | 'THUMBS_DOWN'
  | 'LAUGH'
  | 'HOORAY'
  | 'CONFUSED'
  | 'HEART'
  | 'ROCKET'
  | 'EYES'

export interface Viewer {
  login: string
  avatarUrl: string
  url: string
}

export interface Author {
  login: string
  avatarUrl: string
  url: string
}

export interface ReactionGroup {
  content: ReactionContent
  users: { totalCount: number }
  viewerHasReacted: boolean
}

export interface PageInfo {
  startCursor: string | null
  endCursor: string | null
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface Connection<TNode> {
  totalCount: number
  pageInfo: PageInfo
  nodes: TNode[]
}

export interface Reply {
  id: string
  author: Author | null
  viewerDidAuthor: boolean
  createdAt: string
  url: string
  authorAssociation: string
  lastEditedAt: string | null
  deletedAt: string | null
  isMinimized: boolean
  body: string
  bodyHTML: string
  reactionGroups: ReactionGroup[]
  replyTo: { id: string } | null
}

export interface Comment {
  id: string
  upvoteCount: number
  viewerHasUpvoted: boolean
  viewerCanUpvote: boolean
  author: Author | null
  viewerDidAuthor: boolean
  createdAt: string
  url: string
  authorAssociation: string
  lastEditedAt: string | null
  deletedAt: string | null
  isMinimized: boolean
  body: string
  bodyHTML: string
  reactionGroups: ReactionGroup[]
  replies: RepliesResult
}

export interface DiscussionCategory {
  id: string
  name: string
  slug: string
}

export interface Discussion {
  id: string
  number: number
  title: string
  body: string
  bodyHTML: string
  url: string
  locked: boolean
  createdAt: string
  author: Author | null
  category: DiscussionCategory
  reactionGroups: ReactionGroup[]
  reactions: { totalCount: number }
  comments: Connection<Comment>
}

export type DiscussionSearchNode = Omit<Discussion, 'comments'> & {
  comments: { totalCount: number }
}

export interface DiscussionSearchResult {
  discussionCount: number
  pageInfo: PageInfo
  nodes: DiscussionSearchNode[]
}

export interface Repository {
  id: string
  discussionCategories: {
    nodes: DiscussionCategory[]
  }
}

export interface CreatedDiscussion {
  id: string
  number: number
  url: string
}

export type CreatedComment = Comment

export type CreatedReply = Reply

export interface ToggleReactionResult {
  reaction: {
    id: string
    content: ReactionContent
  } | null
}

export interface ToggleUpvoteResult {
  subject: {
    upvoteCount: number
  }
}

export type RepliesResult = Connection<Reply>
