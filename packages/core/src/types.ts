import type { Discussion as DiscussionType } from "@giscore/services";

export type {
  ReactionContent,
  Author,
  ReactionGroup,
  PageInfo,
  Reply,
  Comment,
  DiscussionCategory,
  Discussion,
  DiscussionSearchResult,
  Repository,
  CreatedDiscussion,
  CreatedComment,
  CreatedReply,
  ToggleReactionResult,
  ToggleUpvoteResult,
  RepliesResult,
} from "@giscore/services";

export interface GiscoreConfig {
  serverUrl: string;
  repo: string;
  category?: string;
  term?: string;
  strict?: boolean;
  token?: string;
}

export interface PaginationParams {
  first?: number;
  last?: number;
  after?: string;
  before?: string;
}

export interface Viewer {
  login: string;
  avatarUrl: string;
  url: string;
}

export interface GiscoreData {
  viewer: Viewer | null;
  discussion: DiscussionType | null;
}
