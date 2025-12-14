import { useState, useEffect, useRef } from "react";
import {
  Discussion,
  Comment,
  Reply,
  Reactions,
  type DiscussionType,
  type CommentType,
  type ReplyType,
  type ReactionContent,
  type PageInfo,
  type Viewer,
} from "@giscore/react";
import {
  useViewer,
  useInfiniteDiscussion,
  useAddComment,
  useAddReply,
  useInfiniteReplies,
  useToggleReaction,
  useToggleUpvote,
} from "@giscore/react/tanstack-query";
import { useGiscore } from "@giscore/react";

function ReactionBar({
  onToggle,
  onAdd,
}: {
  onToggle?: (content: ReactionContent, hasReacted: boolean) => void;
  onAdd?: (content: ReactionContent) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div className="flex items-center gap-1">
      <Reactions.List>
        {(reaction, index) => (
          <button
            key={index}
            onClick={() => onToggle?.(reaction.content, reaction.viewerHasReacted)}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors ${
              reaction.viewerHasReacted
                ? "border-blue-300 bg-blue-50 text-blue-700"
                : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300"
            }`}
          >
            <span>{reaction.emoji}</span>
            <span>{reaction.users.totalCount}</span>
          </button>
        )}
      </Reactions.List>
      <div className="relative">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-500 transition-colors hover:border-gray-300 hover:bg-gray-100"
        >
          +
        </button>
        {showPicker && (
          <div className="absolute bottom-full left-0 z-10 mb-1 rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
            <Reactions.Picker>
              {(reactions) => (
                <div className="flex gap-1">
                  {reactions.map((r) => (
                    <button
                      key={r.content}
                      onClick={() => {
                        onAdd?.(r.content);
                        setShowPicker(false);
                      }}
                      className="rounded p-1 text-base hover:bg-gray-100"
                    >
                      {r.emoji}
                    </button>
                  ))}
                </div>
              )}
            </Reactions.Picker>
          </div>
        )}
      </div>
    </div>
  );
}

function CommentItem({
  comment,
  discussionId,
  onReaction,
  onUpvote,
  onReply,
  isAuthenticated,
}: {
  comment: CommentType;
  discussionId: string;
  onReaction?: (
    subjectId: string,
    content: ReactionContent,
    hasReacted: boolean
  ) => void;
  onUpvote?: (subjectId: string, hasUpvoted: boolean) => void;
  onReply?: (discussionId: string, commentId: string, body: string) => void;
  isAuthenticated?: boolean;
}) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [showAllReplies, setShowAllReplies] = useState(false);
  const hasMoreReplies = comment.replies.pageInfo.hasNextPage;
  const totalReplies = comment.replies.totalCount;
  const visibleReplies = comment.replies.nodes;

  return (
    <Comment.Root comment={comment}>
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="flex items-start gap-3 border-b border-gray-100 p-4">
          <div className="flex flex-col items-center gap-1">
            <Comment.Upvote>
              {({ count, hasUpvoted, canUpvote }) => (
                <button
                  onClick={() => onUpvote?.(comment.id, hasUpvoted)}
                  disabled={!canUpvote}
                  className={`flex flex-col items-center rounded p-1 transition-colors ${
                    hasUpvoted
                      ? "text-blue-600"
                      : "text-gray-400 hover:text-gray-600"
                  } ${!canUpvote ? "cursor-not-allowed opacity-50" : ""}`}
                >
                  <svg
                    className="h-5 w-5"
                    fill={hasUpvoted ? "currentColor" : "none"}
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 15l7-7 7 7"
                    />
                  </svg>
                  <span className="text-xs font-medium">{count}</span>
                </button>
              )}
            </Comment.Upvote>
          </div>
          <Comment.Avatar className="h-8 w-8 rounded-full" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Comment.Author className="font-medium text-gray-900" />
              <Comment.Time className="text-xs text-gray-500" />
            </div>
            <Comment.Body className="prose prose-sm mt-2 text-gray-700" />
            <div className="mt-3 flex items-center gap-4">
              <Comment.Reactions>
                <ReactionBar
                  onToggle={(content, hasReacted) =>
                    onReaction?.(comment.id, content, hasReacted)
                  }
                  onAdd={(content) => onReaction?.(comment.id, content, false)}
                />
              </Comment.Reactions>
              {isAuthenticated && (
                <button
                  onClick={() => setShowReplyForm(!showReplyForm)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Reply
                </button>
              )}
            </div>
          </div>
        </div>

        {showReplyForm && (
          <div className="border-t border-gray-100 bg-gray-50/50 p-4 pl-12">
            <ReplyForm
              onSubmit={(body) => {
                onReply?.(discussionId, comment.id, body);
                setShowReplyForm(false);
              }}
              onCancel={() => setShowReplyForm(false)}
            />
          </div>
        )}

        {visibleReplies.length > 0 && (
          <>
            {visibleReplies.map((reply: ReplyType, index: number) => (
              <ReplyItem key={reply.id || index} reply={reply} onReaction={onReaction} />
            ))}
          </>
        )}

        {hasMoreReplies && !showAllReplies && (
          <LoadMoreReplies
            totalCount={totalReplies}
            loadedCount={visibleReplies.length}
            onExpand={() => setShowAllReplies(true)}
          />
        )}

        {showAllReplies && hasMoreReplies && (
          <ExpandedReplies
            commentId={comment.id}
            initialReplies={visibleReplies}
            onReaction={onReaction}
          />
        )}
      </div>
    </Comment.Root>
  );
}

function ReplyItem({
  reply,
  onReaction,
}: {
  reply: ReplyType;
  onReaction?: (
    subjectId: string,
    content: ReactionContent,
    hasReacted: boolean
  ) => void;
}) {
  return (
    <Reply.Root reply={reply}>
      <div className="flex items-start gap-3 border-t border-gray-100 bg-gray-50/50 p-4 pl-12">
        <Reply.Avatar className="h-6 w-6 rounded-full" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Reply.Author className="text-sm font-medium text-gray-900" />
            <Reply.Time className="text-xs text-gray-500" />
          </div>
          <Reply.Body className="prose prose-sm mt-1 text-gray-700" />
          <div className="mt-2">
            <Reply.Reactions>
              <ReactionBar
                onToggle={(content, hasReacted) =>
                  onReaction?.(reply.id, content, hasReacted)
                }
                onAdd={(content) => onReaction?.(reply.id, content, false)}
              />
            </Reply.Reactions>
          </div>
        </div>
      </div>
    </Reply.Root>
  );
}

function ReplyForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (body: string) => void;
  onCancel: () => void;
}) {
  const [body, setBody] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (body.trim()) {
      onSubmit(body);
      setBody("");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write a reply..."
        className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        rows={2}
        autoFocus
      />
      <div className="mt-2 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!body.trim()}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Reply
        </button>
      </div>
    </form>
  );
}

function LoadMoreReplies({
  totalCount,
  loadedCount,
  onExpand,
}: {
  totalCount: number;
  loadedCount: number;
  onExpand: () => void;
}) {
  const remaining = totalCount - loadedCount;

  return (
    <button
      onClick={onExpand}
      className="w-full border-t border-gray-100 bg-gray-50/50 p-3 text-center text-sm text-blue-600 hover:bg-gray-100"
    >
      View {remaining} more {remaining === 1 ? "reply" : "replies"}
    </button>
  );
}

function ExpandedReplies({
  commentId,
  initialReplies,
  onReaction,
}: {
  commentId: string;
  initialReplies: ReplyType[];
  onReaction?: (
    subjectId: string,
    content: ReactionContent,
    hasReacted: boolean
  ) => void;
}) {
  const {
    data,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteReplies(commentId, 10);

  const allReplies = data?.pages.flatMap((p) => p?.nodes ?? []) ?? [];
  const initialIds = new Set(initialReplies.map((r) => r.id));
  const newReplies = allReplies.filter((r) => !initialIds.has(r.id));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center border-t border-gray-100 bg-gray-50/50 p-4">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      {newReplies.map((reply) => (
        <ReplyItem key={reply.id} reply={reply} onReaction={onReaction} />
      ))}
      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="w-full border-t border-gray-100 bg-gray-50/50 p-3 text-center text-sm text-blue-600 hover:bg-gray-100 disabled:opacity-50"
        >
          {isFetchingNextPage ? "Loading..." : "Load more replies"}
        </button>
      )}
    </>
  );
}

function CommentForm({ onSubmit }: { onSubmit: (body: string) => void }) {
  const [body, setBody] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (body.trim()) {
      onSubmit(body);
      setBody("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write a comment..."
        className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        rows={3}
      />
      <div className="mt-2 flex justify-end">
        <button
          type="submit"
          disabled={!body.trim()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Comment
        </button>
      </div>
    </form>
  );
}

function useIntersectionObserver(
  onIntersect: () => void,
  enabled: boolean
): React.RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onIntersect();
        }
      },
      { threshold: 0.1 }
    );

    const el = ref.current;
    if (el) observer.observe(el);

    return () => {
      if (el) observer.unobserve(el);
    };
  }, [onIntersect, enabled]);

  return ref;
}

interface InfiniteDiscussionViewProps {
  discussion: DiscussionType;
  comments: CommentType[];
  pageInfo: PageInfo;
  totalCount: number;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  onReaction: (
    subjectId: string,
    content: ReactionContent,
    hasReacted: boolean
  ) => void;
  onUpvote: (subjectId: string, hasUpvoted: boolean) => void;
  onReply: (discussionId: string, commentId: string, body: string) => void;
  onAddComment: (body: string) => void;
  isAuthenticated?: boolean;
  onLogin?: () => void;
  viewer?: Viewer | null;
}

function InfiniteDiscussionView({
  discussion,
  comments,
  totalCount,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  onReaction,
  onUpvote,
  onReply,
  onAddComment,
  isAuthenticated = true,
  onLogin,
  viewer,
}: InfiniteDiscussionViewProps) {
  const loadMoreRef = useIntersectionObserver(
    onLoadMore,
    hasNextPage && !isFetchingNextPage
  );

  return (
    <Discussion.Root discussion={discussion}>
      <div className="space-y-6">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <Discussion.Title className="text-xl font-bold text-gray-900" />
          <Discussion.Body className="prose mt-4 text-gray-700" />
          <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
            <Discussion.Reactions>
              <ReactionBar
                onToggle={(content, hasReacted) =>
                  onReaction(discussion.id, content, hasReacted)
                }
                onAdd={(content) => onReaction(discussion.id, content, false)}
              />
            </Discussion.Reactions>
            <div className="text-sm text-gray-500">
              {comments.length} / {totalCount} comments
            </div>
          </div>
        </div>

        {isAuthenticated ? (
          <div className="flex items-start gap-3">
            {viewer && (
              <img
                src={viewer.avatarUrl}
                alt={viewer.login}
                className="h-8 w-8 rounded-full"
              />
            )}
            <div className="flex-1">
              <CommentForm onSubmit={onAddComment} />
            </div>
          </div>
        ) : (
          <button
            onClick={onLogin}
            className="w-full rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white hover:bg-gray-800"
          >
            Sign in with GitHub to comment
          </button>
        )}

        <div className="space-y-4">
          {comments.map((comment, index) => (
            <CommentItem
              key={comment.id || index}
              comment={comment}
              discussionId={discussion.id}
              onReaction={onReaction}
              onUpvote={onUpvote}
              onReply={onReply}
              isAuthenticated={isAuthenticated}
            />
          ))}
        </div>

        {hasNextPage && (
          <div
            ref={loadMoreRef}
            className="flex items-center justify-center py-4"
          >
            {isFetchingNextPage ? (
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            ) : (
              <button
                onClick={onLoadMore}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Load more comments
              </button>
            )}
          </div>
        )}
      </div>
    </Discussion.Root>
  );
}

function LiveInfiniteExample() {
  const { config, isAuthenticated, login } = useGiscore();
  const { data: viewer, refetch: refetchViewer } = useViewer();
  const {
    data,
    isLoading,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteDiscussion(1, 10);

  useEffect(() => {
    if (isAuthenticated) {
      refetchViewer();
    }
  }, [isAuthenticated, refetchViewer]);

  const toggleReaction = useToggleReaction();
  const toggleUpvote = useToggleUpvote();
  const addComment = useAddComment({
    onSuccess: () => {
      refetch();
    },
  });
  const addReply = useAddReply({
    onSuccess: () => {
      refetch();
    },
  });

  const handleReaction = (
    subjectId: string,
    content: ReactionContent,
    hasReacted: boolean
  ) => {
    if (!isAuthenticated) {
      login();
      return;
    }
    toggleReaction.mutate({ subjectId, content, hasReacted });
  };

  const handleUpvote = (subjectId: string, hasUpvoted: boolean) => {
    if (!isAuthenticated) {
      login();
      return;
    }
    toggleUpvote.mutate({ subjectId, hasUpvoted });
  };

  const handleReply = (discussionId: string, commentId: string, body: string) => {
    if (!isAuthenticated) {
      login();
      return;
    }
    addReply.mutate({ discussionId, replyToId: commentId, body });
  };

  const handleAddComment = (body: string) => {
    const firstPage = data?.pages[0] ?? null;
    if (!firstPage) return;
    addComment.mutate({ discussionId: firstPage.id, body });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (error && !error.message.includes("not found")) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        Error loading discussion: {error.message}
      </div>
    );
  }

  const firstPage = data?.pages[0];

  if (!firstPage) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-xl font-bold text-gray-900">
            {config.term || "Discussion"}
          </h2>
          <p className="mt-2 text-gray-600">
            No discussion yet. Be the first to comment!
          </p>
        </div>
        {isAuthenticated ? (
          <div className="rounded-lg border border-gray-200 bg-white p-4 text-center text-gray-500">
            Discussion will be created when the first comment is added.
          </div>
        ) : (
          <button
            onClick={login}
            className="w-full rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white hover:bg-gray-800"
          >
            Sign in with GitHub to comment
          </button>
        )}
      </div>
    );
  }

  const allComments = data.pages.flatMap((p) => p?.comments.nodes ?? []);
  const lastPage = data.pages[data.pages.length - 1];

  return (
    <>
      <InfiniteDiscussionView
        discussion={firstPage}
        comments={allComments}
        pageInfo={lastPage?.comments.pageInfo ?? firstPage.comments.pageInfo}
        totalCount={firstPage.comments.totalCount}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={() => fetchNextPage()}
        onReaction={handleReaction}
        onUpvote={handleUpvote}
        onReply={handleReply}
        onAddComment={handleAddComment}
        isAuthenticated={isAuthenticated}
        onLogin={login}
        viewer={viewer}
      />
      {addComment.isPending && (
        <div className="mt-4 text-center text-gray-500">Adding comment...</div>
      )}
      {addComment.isError && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          Error: {addComment.error.message}
        </div>
      )}
    </>
  );
}

function UserMenu() {
  const { isAuthenticated, isLoading, login, logout } = useGiscore();
  const { data: viewer, refetch: refetchViewer } = useViewer();

  useEffect(() => {
    if (isAuthenticated) {
      refetchViewer();
    }
  }, [isAuthenticated, refetchViewer]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
        <span className="text-sm text-gray-500">Signing in...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <button
        onClick={login}
        className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
      >
        Sign in with GitHub
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {viewer && (
        <>
          <img
            src={viewer.avatarUrl}
            alt={viewer.login}
            className="h-8 w-8 rounded-full"
          />
          <span className="text-sm text-gray-700">{viewer.login}</span>
        </>
      )}
      <button
        onClick={logout}
        className="text-sm text-gray-500 hover:text-gray-700"
      >
        Sign out
      </button>
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-2xl px-4">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Giscore Example</h1>
          <UserMenu />
        </div>

        <LiveInfiniteExample />
      </div>
    </div>
  );
}
