export type ReactionContent =
  | "THUMBS_UP"
  | "THUMBS_DOWN"
  | "LAUGH"
  | "HOORAY"
  | "CONFUSED"
  | "HEART"
  | "ROCKET"
  | "EYES";

export interface Author {
  login: string;
  avatarUrl: string;
  url?: string;
}

export interface ReactionGroup {
  content: ReactionContent;
  users: { totalCount: number };
  viewerHasReacted: boolean;
}

export interface PageInfo {
  startCursor: string | null;
  endCursor: string | null;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface Reply {
  id: string;
  author: Author | null;
  viewerDidAuthor: boolean;
  createdAt: string;
  url: string;
  authorAssociation: string;
  lastEditedAt: string | null;
  deletedAt: string | null;
  isMinimized: boolean;
  bodyHTML: string;
  reactionGroups: ReactionGroup[];
  replyTo: { id: string } | null;
}

export interface Comment {
  id: string;
  upvoteCount: number;
  viewerHasUpvoted: boolean;
  viewerCanUpvote: boolean;
  author: Author | null;
  viewerDidAuthor: boolean;
  createdAt: string;
  url: string;
  authorAssociation: string;
  lastEditedAt: string | null;
  deletedAt: string | null;
  isMinimized: boolean;
  body?: string;
  bodyHTML: string;
  reactionGroups: ReactionGroup[];
  replies: {
    totalCount: number;
    pageInfo: PageInfo;
    nodes: Reply[];
  };
}

export interface DiscussionCategory {
  id: string;
  name: string;
  slug: string;
}

export interface Discussion {
  id: string;
  number: number;
  title: string;
  body: string;
  bodyHTML: string;
  url: string;
  locked: boolean;
  createdAt: string;
  author: Author | null;
  category: DiscussionCategory;
  reactionGroups: ReactionGroup[];
  reactions: { totalCount: number };
  comments: {
    totalCount: number;
    pageInfo: PageInfo;
    nodes: Comment[];
  };
}

export interface DiscussionSearchResult {
  discussionCount: number;
  pageInfo: PageInfo;
  nodes: Discussion[];
}

export interface Repository {
  id: string;
  discussionCategories: {
    nodes: DiscussionCategory[];
  };
}

export interface CreatedDiscussion {
  id: string;
  number: number;
  url: string;
}

export interface CreatedComment {
  id: string;
  upvoteCount: number;
  viewerHasUpvoted: boolean;
  viewerCanUpvote: boolean;
  author: Author | null;
  viewerDidAuthor: boolean;
  createdAt: string;
  url: string;
  authorAssociation: string;
  lastEditedAt: string | null;
  deletedAt: string | null;
  isMinimized: boolean;
  bodyHTML: string;
  reactionGroups: ReactionGroup[];
  replies: {
    totalCount: number;
    pageInfo: PageInfo;
    nodes: Reply[];
  };
}

export interface CreatedReply {
  id: string;
  author: Author | null;
  viewerDidAuthor: boolean;
  createdAt: string;
  url: string;
  authorAssociation: string;
  lastEditedAt: string | null;
  deletedAt: string | null;
  isMinimized: boolean;
  bodyHTML: string;
  reactionGroups: ReactionGroup[];
  replyTo: { id: string } | null;
}

export interface ToggleReactionResult {
  reaction: {
    id: string;
    content: ReactionContent;
  } | null;
}

export interface ToggleUpvoteResult {
  subject: {
    upvoteCount: number;
  };
}

export interface RepliesResult {
  totalCount: number;
  pageInfo: PageInfo;
  nodes: Reply[];
}
