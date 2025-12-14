import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from "@tanstack/react-query";
import type {
  Discussion,
  DiscussionSearchResult,
  CreatedComment,
  CreatedReply,
  ReactionContent,
  ToggleReactionResult,
  ToggleUpvoteResult,
  Viewer,
} from "@giscore/core";
import { useGiscore } from "../context";

export const giscoreKeys = {
  all: ["giscore"] as const,
  viewer: () => [...giscoreKeys.all, "viewer"] as const,
  discussions: () => [...giscoreKeys.all, "discussion"] as const,
  discussion: (number: number) =>
    [...giscoreKeys.discussions(), number] as const,
  discussionInfinite: (number: number) =>
    [...giscoreKeys.discussions(), number, "infinite"] as const,
  search: (term: string) =>
    [...giscoreKeys.discussions(), "search", term] as const,
  searchInfinite: (term: string) =>
    [...giscoreKeys.discussions(), "search", term, "infinite"] as const,
};

export function useViewer(
  options?: Omit<UseQueryOptions<Viewer | null>, "queryKey" | "queryFn">
) {
  const { client } = useGiscore();

  return useQuery({
    queryKey: giscoreKeys.viewer(),
    queryFn: async () => {
      if (!client.isAuthenticated) return null;
      return client.getViewer();
    },
    ...options,
  });
}

export function useDiscussion(
  number: number,
  options?: Omit<UseQueryOptions<Discussion | null>, "queryKey" | "queryFn">
) {
  const { client } = useGiscore();

  return useQuery({
    queryKey: giscoreKeys.discussion(number),
    queryFn: () => client.getDiscussion(number),
    ...options,
  });
}

export function useInfiniteDiscussion(number: number, pageSize = 10) {
  const { client } = useGiscore();

  return useInfiniteQuery({
    queryKey: giscoreKeys.discussionInfinite(number),
    queryFn: ({ pageParam }) =>
      client.getDiscussion(number, {
        first: pageSize,
        after: pageParam,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage?.comments.pageInfo.hasNextPage
        ? lastPage.comments.pageInfo.endCursor ?? undefined
        : undefined,
    getPreviousPageParam: (firstPage) =>
      firstPage?.comments.pageInfo.hasPreviousPage
        ? firstPage.comments.pageInfo.startCursor ?? undefined
        : undefined,
  });
}

export function useSearchDiscussions(
  term: string,
  options?: Omit<
    UseQueryOptions<DiscussionSearchResult | null>,
    "queryKey" | "queryFn"
  >
) {
  const { client } = useGiscore();

  return useQuery({
    queryKey: giscoreKeys.search(term),
    queryFn: () => client.searchDiscussions(term),
    enabled: !!term,
    ...options,
  });
}

export function useInfiniteSearchDiscussions(term: string, pageSize = 10) {
  const { client } = useGiscore();

  return useInfiniteQuery({
    queryKey: giscoreKeys.searchInfinite(term),
    queryFn: ({ pageParam }) =>
      client.searchDiscussions(term, {
        first: pageSize,
        after: pageParam,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage?.pageInfo.hasNextPage
        ? lastPage.pageInfo.endCursor ?? undefined
        : undefined,
    getPreviousPageParam: (firstPage) =>
      firstPage?.pageInfo.hasPreviousPage
        ? firstPage.pageInfo.startCursor ?? undefined
        : undefined,
    enabled: !!term,
  });
}

interface AddCommentVariables {
  discussionId: string;
  body: string;
}

export function useAddComment(
  options?: Omit<
    UseMutationOptions<CreatedComment, Error, AddCommentVariables>,
    "mutationFn"
  >
) {
  const { client } = useGiscore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ discussionId, body }: AddCommentVariables) =>
      client.addComment(discussionId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: giscoreKeys.discussions() });
    },
    ...options,
  });
}

interface AddReplyVariables {
  discussionId: string;
  replyToId: string;
  body: string;
}

export function useAddReply(
  options?: Omit<
    UseMutationOptions<CreatedReply, Error, AddReplyVariables>,
    "mutationFn"
  >
) {
  const { client } = useGiscore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ discussionId, replyToId, body }: AddReplyVariables) =>
      client.addReply(discussionId, replyToId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: giscoreKeys.discussions() });
    },
    ...options,
  });
}

interface ToggleReactionVariables {
  subjectId: string;
  content: ReactionContent;
  hasReacted: boolean;
}

export function useToggleReaction(
  options?: Omit<
    UseMutationOptions<ToggleReactionResult, Error, ToggleReactionVariables>,
    "mutationFn"
  >
) {
  const { client } = useGiscore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ subjectId, content, hasReacted }: ToggleReactionVariables) =>
      client.toggleReaction(subjectId, content, hasReacted),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: giscoreKeys.discussions() });
    },
    ...options,
  });
}

interface ToggleUpvoteVariables {
  subjectId: string;
  hasUpvoted: boolean;
}

export function useToggleUpvote(
  options?: Omit<
    UseMutationOptions<ToggleUpvoteResult, Error, ToggleUpvoteVariables>,
    "mutationFn"
  >
) {
  const { client } = useGiscore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ subjectId, hasUpvoted }: ToggleUpvoteVariables) =>
      client.toggleUpvote(subjectId, hasUpvoted),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: giscoreKeys.discussions() });
    },
    ...options,
  });
}
